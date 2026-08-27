"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useToast } from "@/components/toast/ToastProvider";
import { getProfile } from "@/lib/profile";
import { publicClient } from "@/lib/publicClient";
import { createNotification } from "@/lib/notifications";
import {
  formatUnits,
  type Address,
} from "viem";

const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as Address;

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;

const TOKEN_ADDRESSES = [
  USDC_ADDRESS,
  EURC_ADDRESS,
] as Address[];

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/*
 * Arc public RPC is rate limited.
 *
 * Keep the watcher intentionally slow.
 * One polling cycle = one getBlockNumber + one eth_getLogs.
 */
const POLL_INTERVAL = 30000;

/*
 * If RPC returns 429, wait 90 seconds.
 */
const RATE_LIMIT_BACKOFF = 90000;

/*
 * Maximum range per eth_getLogs request.
 *
 * Use Number here so this project does not require
 * bigint literals / ES2020 target.
 */
const MAX_BLOCK_RANGE = 2000;

type PaymentAsset = "USDC" | "EURC";

type DetectedPayment = {
  asset: PaymentAsset;
  from: Address;
  to: Address;
  value: bigint;
  transactionHash?: string;
  logIndex?: number;
  blockNumber?: bigint;
};

type RawTransferLog = {
  address: Address;
  topics: readonly string[];
  data: string;
  transactionHash?: string;
  logIndex?: string;
  blockNumber?: string;
};

type ArivoWatcherWindow = Window & {
  __arivoIncomingPaymentWatcherActive__?: boolean;
};

function isRateLimitError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const lower = message.toLowerCase();

  return (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("request exceeds defined limit")
  );
}

function getAssetName(address: Address): PaymentAsset {
  if (
    address.toLowerCase() ===
    EURC_ADDRESS.toLowerCase()
  ) {
    return "EURC";
  }

  return "USDC";
}

function makePaymentId(
  transactionHash: string | undefined,
  logIndex: number | undefined,
  asset: PaymentAsset
): string {
  return [
    transactionHash ?? "unknown",
    String(logIndex ?? 0),
    asset,
  ].join(":");
}

function shortAddress(address: string): string {
  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function IncomingPaymentWatcher() {
  const {
    user,
    ready,
    authenticated,
  } = usePrivy();

  const { success } = useToast();

  /*
   * Keep the latest toast function without
   * restarting the blockchain watcher.
   */
  const successRef = useRef(success);

  useEffect(() => {
    successRef.current = success;
  }, [success]);

  /*
   * Prevent overlapping RPC requests.
   */
  const checkingRef = useRef(false);

  /*
   * First successful block becomes the baseline.
   *
   * Existing/old payments will NOT create a toast
   * immediately after opening the app.
   */
  const initializedRef = useRef(false);

  /*
   * Last successfully checked block.
   */
  const lastCheckedBlockRef =
    useRef<bigint | null>(null);

  /*
   * Prevent duplicate notifications.
   */
  const seenPaymentsRef =
    useRef<Set<string>>(new Set());

  /*
   * RPC backoff after 429.
   */
  const backoffUntilRef =
    useRef<number>(0);

  /*
   * Prevent multiple watcher components
   * from polling the RPC at the same time.
   */
  const localInstanceRef =
    useRef(false);

  useEffect(() => {
    /*
     * No authenticated user.
     */
    if (!ready || !authenticated) {
      checkingRef.current = false;
      initializedRef.current = false;
      lastCheckedBlockRef.current = null;
      seenPaymentsRef.current.clear();
      backoffUntilRef.current = 0;
      localInstanceRef.current = false;

      return;
    }

    /*
     * Resolve wallet ONCE.
     *
     * This also removes the old
     * "possibly undefined" TypeScript errors.
     */
    const walletAddress =
      user?.wallet?.address as Address | undefined;

    if (!walletAddress) {
      checkingRef.current = false;
      initializedRef.current = false;
      lastCheckedBlockRef.current = null;
      seenPaymentsRef.current.clear();
      backoffUntilRef.current = 0;
      localInstanceRef.current = false;

      return;
    }

    /*
     * Freeze recipient address.
     *
     * IMPORTANT:
     * recipientAddress is explicitly typed as Address
     * after the undefined check above.
     */
    const recipientAddress: Address =
      walletAddress;

    /*
     * GLOBAL SINGLETON LOCK
     *
     * Even if another page accidentally mounts
     * another watcher, only ONE watcher will poll.
     *
     * This is important because the old duplicate
     * watcher was one of the causes of RPC 429.
     */
    const watcherWindow =
      window as ArivoWatcherWindow;

    if (
      watcherWindow.__arivoIncomingPaymentWatcherActive__
    ) {
      return;
    }

    watcherWindow.__arivoIncomingPaymentWatcherActive__ =
      true;

    localInstanceRef.current = true;

    let cancelled = false;

    async function checkIncomingPayments() {
      if (cancelled) {
        return;
      }

      /*
       * Never overlap requests.
       */
      if (checkingRef.current) {
        return;
      }

      /*
       * Do not waste RPC requests when tab is hidden.
       */
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      /*
       * Respect 429 backoff.
       */
      if (
        Date.now() <
        backoffUntilRef.current
      ) {
        return;
      }

      checkingRef.current = true;

      try {
        /*
         * STEP 1
         *
         * Get current block.
         */
        const latestBlock =
          await publicClient.getBlockNumber();

        if (cancelled) {
          return;
        }

        /*
         * FIRST CHECK = BASELINE ONLY.
         *
         * No toast for old payments.
         */
        if (
          !initializedRef.current ||
          lastCheckedBlockRef.current === null
        ) {
          initializedRef.current = true;
          lastCheckedBlockRef.current =
            latestBlock;

          return;
        }

        /*
         * Nothing new.
         */
        if (
          latestBlock <=
          lastCheckedBlockRef.current
        ) {
          return;
        }

        /*
         * Calculate the range.
         */
        let fromBlock =
          lastCheckedBlockRef.current;

        const maxRange =
          BigInt(MAX_BLOCK_RANGE);

        /*
         * If the browser was sleeping for a long time,
         * only inspect the latest MAX_BLOCK_RANGE blocks.
         */
        if (
          latestBlock - fromBlock >
          maxRange
        ) {
          fromBlock =
            latestBlock - maxRange;
        }

        /*
         * ONE raw eth_getLogs request.
         *
         * USDC + EURC are queried together.
         *
         * Recipient is encoded directly into topic[2].
         */
        const recipientTopic =
          `0x${recipientAddress
            .slice(2)
            .toLowerCase()
            .padStart(64, "0")}`;

        const rawLogs =
          (await publicClient.request({
            method: "eth_getLogs",
            params: [
              {
                address: TOKEN_ADDRESSES,
                topics: [
                  TRANSFER_TOPIC,
                  null,
                  recipientTopic,
                ],
                fromBlock:
                  `0x${fromBlock.toString(16)}`,
                toBlock:
                  `0x${latestBlock.toString(16)}`,
              },
            ],
          } as any)) as RawTransferLog[];

        if (cancelled) {
          return;
        }

        /*
         * Move cursor ONLY after successful RPC.
         */
        lastCheckedBlockRef.current =
          latestBlock;

        /*
         * No incoming payments.
         */
        if (!rawLogs || !rawLogs.length) {
          return;
        }

        const payments: DetectedPayment[] = [];

        /*
         * Decode Transfer logs.
         */
        for (const log of rawLogs) {
          if (cancelled) {
            return;
          }

          const fromTopic =
            log.topics[1];

          const toTopic =
            log.topics[2];

          if (
            !fromTopic ||
            !toTopic ||
            !log.data
          ) {
            continue;
          }

          const from =
            `0x${fromTopic.slice(-40)}` as Address;

          const to =
            `0x${toTopic.slice(-40)}` as Address;

          let value: bigint;

          try {
            value = BigInt(log.data);
          } catch {
            continue;
          }

          /*
           * Only payments TO current wallet.
           */
          if (
            to.toLowerCase() !==
            recipientAddress.toLowerCase()
          ) {
            continue;
          }

          /*
           * Ignore self transfers.
           */
          if (
            from.toLowerCase() ===
            recipientAddress.toLowerCase()
          ) {
            continue;
          }

          const tokenAddress =
            log.address as Address;

          const asset =
            getAssetName(tokenAddress);

          payments.push({
            asset,
            from,
            to,
            value,
            transactionHash:
              log.transactionHash,
            logIndex:
              log.logIndex === undefined
                ? undefined
                : Number(
                    BigInt(log.logIndex)
                  ),
            blockNumber:
              log.blockNumber === undefined
                ? undefined
                : BigInt(
                    log.blockNumber
                  ),
          });
        }

        /*
         * Process payments in chronological order.
         */
        payments.sort((a, b) => {
          const blockA =
            a.blockNumber ?? BigInt(0);

          const blockB =
            b.blockNumber ?? BigInt(0);

          if (blockA !== blockB) {
            return blockA < blockB
              ? -1
              : 1;
          }

          return (
            (a.logIndex ?? 0) -
            (b.logIndex ?? 0)
          );
        });

        /*
         * Process every new payment.
         */
        for (const payment of payments) {
          if (cancelled) {
            return;
          }

          /*
           * Unique blockchain event ID.
           */
          const paymentId =
            makePaymentId(
              payment.transactionHash,
              payment.logIndex,
              payment.asset
            );

          /*
           * Already shown.
           */
          if (
            seenPaymentsRef.current.has(
              paymentId
            )
          ) {
            continue;
          }

          seenPaymentsRef.current.add(
            paymentId
          );

          /*
           * Keep memory bounded.
           */
          if (
            seenPaymentsRef.current.size >
            500
          ) {
            const oldest =
              seenPaymentsRef.current
                .values()
                .next()
                .value as
                | string
                | undefined;

            if (oldest) {
              seenPaymentsRef.current.delete(
                oldest
              );
            }
          }

          /*
           * Amount.
           */
          const amount =
            Number(
              formatUnits(
                payment.value,
                6
              )
            );

          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            continue;
          }

          /*
           * Default sender = wallet.
           */
          let senderName =
            shortAddress(payment.from);

          /*
           * Try to resolve Arivo username.
           *
           * Failure here NEVER prevents
           * the payment toast.
           */
          try {
            const profile =
              await getProfile(
                payment.from
              );

            if (
              profile?.username
            ) {
              senderName =
                profile.username.replace(
                  /^@/,
                  ""
                );
            }
          } catch {
            /*
             * Keep wallet fallback.
             */
          }

          /*
           * Notification content.
           */
          const notificationTitle =
            `${payment.asset} received`;

          const notificationMessage =
            `${amount.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 6,
              }
            )} ${payment.asset} received from @${senderName}`;

          /*
           * Persist the notification in Supabase.
           *
           * IMPORTANT:
           * This call MUST match the actual
           * createNotification() API.
           *
           * recipientAddress -> recipient_address
           * transactionHash  -> transaction_hash
           * asset            -> asset
           * amount           -> amount
           * senderAddress    -> sender_address
           */
          try {
            await createNotification({
              recipientAddress,
              type: "payment",
              title: notificationTitle,
              message: notificationMessage,
              transactionHash:
                payment.transactionHash,
              asset: payment.asset,
              amount,
              senderAddress:
                payment.from,
            });
          } catch (notificationError) {
            /*
             * Notification failure must NEVER
             * stop the blockchain watcher or toast.
             */
            console.error(
              "Failed to create incoming payment notification:",
              notificationError
            );
          }

          /*
           * FINAL TOAST
           */
          successRef.current(
            notificationTitle,
            notificationMessage
          );

          /*
           * Tell the notification UI to refresh.
           */
          window.dispatchEvent(
            new Event("refreshNotifications")
          );

          /*
           * Refresh balance everywhere.
           */
          window.dispatchEvent(
            new Event("refreshBalance")
          );

          /*
           * Refresh transactions everywhere.
           */
          window.dispatchEvent(
            new Event("refreshTransactions")
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        /*
         * 429:
         *
         * Do NOT spam console.
         * Just back off.
         */
        if (isRateLimitError(error)) {
          backoffUntilRef.current =
            Date.now() +
            RATE_LIMIT_BACKOFF;

          return;
        }

        /*
         * Unexpected error.
         *
         * One error per polling cycle only.
         */
        console.error(
          "Incoming payment watcher error:",
          error
        );
      } finally {
        checkingRef.current = false;
      }
    }

    /*
     * First call establishes baseline.
     */
    void checkIncomingPayments();

    /*
     * Poll every 30 seconds.
     */
    const interval =
      window.setInterval(
        () => {
          void checkIncomingPayments();
        },
        POLL_INTERVAL
      );

    /*
     * When user comes back to the tab,
     * perform an immediate check.
     */
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void checkIncomingPayments();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      checkingRef.current = false;
      initializedRef.current = false;
      lastCheckedBlockRef.current =
        null;
      seenPaymentsRef.current.clear();
      backoffUntilRef.current = 0;

      /*
       * Release global singleton.
       */
      if (
        localInstanceRef.current
      ) {
        watcherWindow.__arivoIncomingPaymentWatcherActive__ =
          false;

        localInstanceRef.current =
          false;
      }
    };
  }, [
    ready,
    authenticated,
    user?.wallet?.address,
  ]);

  return null;
}