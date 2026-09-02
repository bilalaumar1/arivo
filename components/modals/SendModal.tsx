"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  ChevronDown,
  Check,
  X,
  ArrowRight,
  Copy,
} from "lucide-react";

import { sendUSDC } from "@/lib/sendUSDC";
import { sendEURC } from "@/lib/sendEURC";
import { getProfileByArivoId } from "@/lib/profile";
import { getWalletBalance } from "@/lib/wallet";
import { publicClient } from "@/lib/publicClient";
import { formatUnits, type EIP1193Provider } from "viem";
import { useToast } from "@/components/toast/ToastProvider";

type SendMethod = "arivo" | "wallet";
type Asset = "USDC" | "EURC";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

const erc20BalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type SendModalProps = {
  open: boolean;
  onClose: () => void;
  initialRecipient?: string;
  initialMethod?: SendMethod;
};

type RecipientProfile = {
  username: string;
  avatar: string;
  wallet: string;
  arivo_id: string;
};

/**
 * Generic EIP-1193 provider shape.
 *
 * We intentionally do NOT use viem's EIP1193Provider type here for
 * the chain-switch helper because Privy and browser wallets expose
 * slightly different request() typings.
 */
type TransactionProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

// ============================================================
// ARC TESTNET
// ============================================================

const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_TESTNET_CHAIN_ID_HEX = "0x4cef52";

/**
 * Used ONLY for external browser wallets such as MetaMask.
 *
 * IMPORTANT:
 * Privy embedded wallets MUST NOT use wallet_switchEthereumChain
 * through their EIP-1193 provider.
 * They use activeWallet.switchChain(...) instead.
 */
async function ensureArcTestnet(
  provider: TransactionProvider
): Promise<void> {
  const currentChainId = await provider.request({
    method: "eth_chainId",
  });

  const currentChainIdNumber =
    typeof currentChainId === "string"
      ? parseInt(currentChainId, 16)
      : Number(currentChainId);

  if (currentChainIdNumber === ARC_TESTNET_CHAIN_ID) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET_CHAIN_ID_HEX,
        },
      ],
    });
  } catch (switchError) {
    const errorCode =
      typeof switchError === "object" &&
      switchError !== null &&
      "code" in switchError
        ? Number(
            (switchError as { code?: unknown }).code
          )
        : undefined;

    const errorMessage =
      switchError instanceof Error
        ? switchError.message
        : String(switchError);

    const chainIsNotAdded =
      errorCode === 4902 ||
      /unsupported chain|unknown chain|chain.*not.*added/i.test(
        errorMessage
      );

    if (!chainIsNotAdded) {
      throw switchError;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET_CHAIN_ID_HEX,
          chainName: "Arc Testnet",
          nativeCurrency: {
            name: "USDC",
            symbol: "USDC",
            decimals: 18,
          },
          rpcUrls: [
            "https://rpc.testnet.arc.network",
          ],
          blockExplorerUrls: [
            "https://testnet.arcscan.app",
          ],
        },
      ],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET_CHAIN_ID_HEX,
        },
      ],
    });
  }

  const finalChainId = await provider.request({
    method: "eth_chainId",
  });

  const finalChainIdNumber =
    typeof finalChainId === "string"
      ? parseInt(finalChainId, 16)
      : Number(finalChainId);

  if (finalChainIdNumber !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(
      `Wallet is not connected to Arc Testnet. Current chain: ${finalChainIdNumber}`
    );
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function SendModal({
  open,
  onClose,
  initialRecipient = "",
  initialMethod = "arivo",
}: SendModalProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const {
    success,
    error: toastError,
  } = useToast();

  const [sendMethod, setSendMethod] =
    useState<SendMethod>(initialMethod);

  const [selectedAsset, setSelectedAsset] =
    useState<Asset>("USDC");

  const [recipient, setRecipient] =
    useState(initialRecipient);

  const [amount, setAmount] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [lookingUp, setLookingUp] =
    useState(false);

  const [error, setError] =
    useState("");

  const [recipientProfile, setRecipientProfile] =
    useState<RecipientProfile | null>(null);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [assetMenuOpen, setAssetMenuOpen] =
    useState(false);

  const [usdcBalance, setUsdcBalance] =
    useState("0.00");

  const [eurcBalance, setEurcBalance] =
    useState("0.00");

  // ==========================================================
  // LOAD BALANCES
  // ==========================================================

  const loadBalances = useCallback(async () => {
    const address = user?.wallet?.address as
      | `0x${string}`
      | undefined;

    if (!address) {
      setUsdcBalance("0.00");
      setEurcBalance("0.00");
      return;
    }

    try {
      // USDC
      const usdc = await getWalletBalance(address);
      setUsdcBalance(usdc);

      // EURC
      const eurcRaw =
        await publicClient.readContract({
          address: EURC_ADDRESS,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [address],
        });

      setEurcBalance(
        formatUnits(eurcRaw, 6)
      );
    } catch (error) {
      console.error(
        "Failed to load send balances:",
        error
      );
    }
  }, [user?.wallet?.address]);

  // ==========================================================
  // RESET WHEN OPEN
  // ==========================================================

  useEffect(() => {
    if (!open) return;

    setSendMethod(initialMethod);
    setSelectedAsset("USDC");
    setRecipient(initialRecipient);
    setAmount("");
    setError("");
    setRecipientProfile(null);
    setShowConfirmation(false);
    setAssetMenuOpen(false);
  }, [
    open,
    initialRecipient,
    initialMethod,
  ]);

  // ==========================================================
  // BALANCE REFRESH
  // ==========================================================

  useEffect(() => {
    if (!open) return;

    loadBalances();

    const refresh = () => {
      loadBalances();
    };

    window.addEventListener(
      "refreshBalance",
      refresh
    );

    return () => {
      window.removeEventListener(
        "refreshBalance",
        refresh
      );
    };
  }, [
    open,
    loadBalances,
    user?.wallet?.address,
  ]);

  const availableBalance =
    selectedAsset === "USDC"
      ? usdcBalance
      : eurcBalance;

  if (!open) return null;

  // ==========================================================
  // CONTINUE
  // ==========================================================

  async function handleContinue() {
    setError("");

    if (!recipient.trim()) {
      setError(
        sendMethod === "arivo"
          ? "Please enter an Arivo ID."
          : "Please enter a wallet address."
      );
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (
      Number(amount) >
      Number(availableBalance)
    ) {
      setError(
        `Insufficient ${selectedAsset} balance.`
      );
      return;
    }

    try {
      setLookingUp(true);

      let profile: RecipientProfile | null =
        recipientProfile;

      // ------------------------------------------------------
      // ARIVO ID
      // ------------------------------------------------------

      if (sendMethod === "arivo") {
        const arivoId =
          recipient.trim().toUpperCase();

        const foundProfile =
          await getProfileByArivoId(arivoId);

        if (!foundProfile) {
          setError("Arivo ID not found.");
          return;
        }

        if (!foundProfile.wallet) {
          setError(
            "This Arivo ID has no wallet."
          );
          return;
        }

        profile = {
          username: foundProfile.username,
          avatar: foundProfile.avatar ?? "",
          wallet: foundProfile.wallet,
          arivo_id:
            foundProfile.arivo_id ??
            arivoId,
        };

        setRecipientProfile(profile);
      }

      // ------------------------------------------------------
      // WALLET ADDRESS
      // ------------------------------------------------------

      if (sendMethod === "wallet") {
        const walletAddress =
          recipient.trim();

        if (
          !walletAddress.startsWith("0x") ||
          walletAddress.length !== 42
        ) {
          setError(
            "Invalid wallet address."
          );
          return;
        }
      }

      setShowConfirmation(true);
    } catch (error) {
      console.error(
        "Recipient lookup failed:",
        error
      );

      setError(
        "Could not find the recipient. Please try again."
      );
    } finally {
      setLookingUp(false);
    }
  }

  // ==========================================================
  // CONFIRM & SEND
  // ==========================================================

  async function handleConfirmSend() {
    setError("");

    try {
      setLoading(true);

      let walletAddress =
        recipient.trim();

      // ------------------------------------------------------
      // RESOLVE ARIVO RECIPIENT
      // ------------------------------------------------------

      if (sendMethod === "arivo") {
        if (!recipientProfile) {
          const message =
            "Recipient profile not found.";

          setError(message);

          toastError(
            "Recipient not found",
            message
          );

          return;
        }

        walletAddress =
          recipientProfile.wallet;
      }

      // ------------------------------------------------------
      // VALIDATE WALLET
      // ------------------------------------------------------

      if (
        !walletAddress.startsWith("0x") ||
        walletAddress.length !== 42
      ) {
        const message =
          "Invalid wallet address.";

        setError(message);

        toastError(
          "Invalid wallet address",
          message
        );

        return;
      }

      // ------------------------------------------------------
      // FIND ACTIVE PRIVY WALLET
      // ------------------------------------------------------

      const activeWallet =
        wallets.find(
          (wallet) =>
            wallet.address.toLowerCase() ===
            user?.wallet?.address?.toLowerCase()
        );

      // ------------------------------------------------------
      // PROVIDER
      // ------------------------------------------------------

      let transactionProvider:
        | TransactionProvider
        | undefined;

      if (activeWallet) {
        /**
         * Google / Privy embedded Arivo Wallet.
         *
         * Get the provider only for the transaction.
         * Chain switching is handled separately below
         * with activeWallet.switchChain().
         */
        transactionProvider =
          (await activeWallet.getEthereumProvider()) as unknown as TransactionProvider;
      } else if (
        typeof window !== "undefined" &&
        window.ethereum
      ) {
        /**
         * External wallet such as MetaMask.
         */
        transactionProvider =
          window.ethereum as unknown as TransactionProvider;
      }

      if (!transactionProvider) {
        throw new Error(
          "Wallet provider not found. Please connect a wallet."
        );
      }

      // ------------------------------------------------------
      // ARC TESTNET SWITCH
      // ------------------------------------------------------
      //
      // THIS IS THE IMPORTANT FIX.
      //
      // Privy embedded wallet:
      //   activeWallet.switchChain(5042002)
      //
      // External wallet:
      //   wallet_switchEthereumChain / wallet_addEthereumChain
      //
      // NEVER call wallet_switchEthereumChain on the
      // Privy embedded provider.
      // ------------------------------------------------------

      if (activeWallet) {
        await activeWallet.switchChain(
          ARC_TESTNET_CHAIN_ID
        );
      } else {
        await ensureArcTestnet(
          transactionProvider
        );
      }

      // ------------------------------------------------------
      // SEND TRANSACTION
      // ------------------------------------------------------

      let hash: string;

      if (selectedAsset === "USDC") {
        hash = await sendUSDC(
          walletAddress as `0x${string}`,
          amount,
          transactionProvider as unknown as EIP1193Provider
        );
      } else {
        hash = await sendEURC(
          walletAddress as `0x${string}`,
          amount,
          transactionProvider as unknown as EIP1193Provider
        );
      }

      console.log(
        `${selectedAsset} Transaction Hash:`,
        hash
      );

      // ------------------------------------------------------
      // WAIT FOR ON-CHAIN CONFIRMATION
      // ------------------------------------------------------

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });

      console.log(
        `${selectedAsset} Transaction Receipt:`,
        receipt
      );

      if (receipt.status !== "success") {
        throw new Error(
          `${selectedAsset} transaction reverted`
        );
      }

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      success(
        `${selectedAsset} sent successfully`,
        `${Number(amount).toFixed(
          2
        )} ${selectedAsset} was sent to the recipient.`
      );

      // ------------------------------------------------------
      // RESET
      // ------------------------------------------------------

      setRecipient("");
      setAmount("");
      setError("");
      setRecipientProfile(null);
      setShowConfirmation(false);
      setAssetMenuOpen(false);

      // ------------------------------------------------------
      // CLOSE
      // ------------------------------------------------------

      onClose();

      // ------------------------------------------------------
      // REFRESH BALANCE + TRANSACTIONS
      // ------------------------------------------------------

      window.dispatchEvent(
        new Event("refreshBalance")
      );
    } catch (error) {
      console.error(
        "Transaction failed:",
        error
      );

      const rawMessage =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "Transaction error details:",
        rawMessage
      );

      setError(
        `${selectedAsset} transaction failed.`
      );

      toastError(
        `${selectedAsset} transaction failed`,
        rawMessage ||
          "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  function handleAssetChange(
    asset: Asset
  ) {
    setSelectedAsset(asset);
    setAssetMenuOpen(false);
    setAmount("");
    setError("");
  }

  function handleMethodChange(
    method: SendMethod
  ) {
    setSendMethod(method);
    setRecipient("");
    setAmount("");
    setError("");
    setRecipientProfile(null);
    setShowConfirmation(false);
  }

  function handleBack() {
    setShowConfirmation(false);
    setError("");
  }

  const shortRecipientWallet =
    recipientProfile?.wallet
      ? `${recipientProfile.wallet.slice(
          0,
          8
        )}...${recipientProfile.wallet.slice(
          -4
        )}`
      : "";

  const assetIcon =
    selectedAsset === "USDC"
      ? "/usdc-logo.png"
      : "/eurc-logo.png";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-[#303030] bg-[#181818] shadow-[0_25px_80px_rgba(0,0,0,0.55)]">

        {!showConfirmation ? (
          <>
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[#292929] px-7 py-5">
              <h2 className="text-[22px] font-semibold tracking-tight text-white">
                Send
              </h2>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-white disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}

            <div className="px-7 pb-7 pt-6">

              {/* SEND TO */}

              <div className="mb-6">
                <div className="mb-3">
                  <p className="text-[13px] font-medium text-zinc-400">
                    Send to
                  </p>
                </div>

                <div className="flex rounded-xl border border-[#303030] bg-[#202020] p-1">

                  <button
                    type="button"
                    onClick={() =>
                      handleMethodChange("arivo")
                    }
                    disabled={
                      loading ||
                      lookingUp
                    }
                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                      sendMethod === "arivo"
                        ? "bg-[#f3ead7] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Arivo ID
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleMethodChange(
                        "wallet"
                      )
                    }
                    disabled={
                      loading ||
                      lookingUp
                    }
                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                      sendMethod === "wallet"
                        ? "bg-[#f3ead7] text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Wallet Address
                  </button>

                </div>
              </div>

              {/* ASSET */}

              <div className="mb-5">
                <label className="mb-2 block text-[13px] font-medium text-zinc-400">
                  Asset
                </label>

                <div className="relative">

                  <button
                    type="button"
                    onClick={() =>
                      setAssetMenuOpen(
                        !assetMenuOpen
                      )
                    }
                    disabled={
                      loading ||
                      lookingUp
                    }
                    className="flex h-[68px] w-full items-center justify-between rounded-xl border border-[#303030] bg-[#202020] px-4 transition hover:border-[#454545]"
                  >
                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
                        <img
                          src={assetIcon}
                          alt={selectedAsset}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-white">
                          {selectedAsset}
                        </p>

                        <p className="mt-0.5 text-[12px] text-zinc-500">
                          {selectedAsset ===
                          "USDC"
                            ? "USD Coin"
                            : "Euro Coin"}
                        </p>
                      </div>

                    </div>

                    <ChevronDown
                      size={18}
                      className={`text-zinc-500 transition-transform ${
                        assetMenuOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {assetMenuOpen && (
                    <div className="absolute left-0 right-0 top-[76px] z-50 overflow-hidden rounded-xl border border-[#353535] bg-[#202020] p-1.5 shadow-2xl">

                      {/* USDC */}

                      <button
                        type="button"
                        onClick={() =>
                          handleAssetChange(
                            "USDC"
                          )
                        }
                        className="flex w-full items-center justify-between rounded-lg px-3 py-3 transition hover:bg-[#292929]"
                      >
                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
                            <img
                              src="/usdc-logo.png"
                              alt="USDC"
                              className="h-full w-full object-contain"
                            />
                          </div>

                          <div className="text-left">
                            <p className="text-sm font-medium text-white">
                              USDC
                            </p>

                            <p className="text-[11px] text-zinc-500">
                              USD Coin
                            </p>
                          </div>

                        </div>

                        {selectedAsset ===
                          "USDC" && (
                          <Check
                            size={17}
                            className="text-[#f3ead7]"
                          />
                        )}
                      </button>

                      {/* EURC */}

                      <button
                        type="button"
                        onClick={() =>
                          handleAssetChange(
                            "EURC"
                          )
                        }
                        className="flex w-full items-center justify-between rounded-lg px-3 py-3 transition hover:bg-[#292929]"
                      >
                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
                            <img
                              src="/eurc-logo.png"
                              alt="EURC"
                              className="h-full w-full object-contain"
                            />
                          </div>

                          <div className="text-left">
                            <p className="text-sm font-medium text-white">
                              EURC
                            </p>

                            <p className="text-[11px] text-zinc-500">
                              Euro Coin
                            </p>
                          </div>

                        </div>

                        {selectedAsset ===
                          "EURC" && (
                          <Check
                            size={17}
                            className="text-[#f3ead7]"
                          />
                        )}
                      </button>

                    </div>
                  )}

                </div>
              </div>

              {/* RECIPIENT */}

              <div className="mb-5">

                <div className="mb-2">
                  <label className="text-[13px] font-medium text-zinc-400">
                    {sendMethod === "arivo"
                      ? "Arivo ID"
                      : "Wallet address"}
                  </label>
                </div>

                <div className="relative">

                  <input
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(
                        e.target.value
                      );
                      setError("");
                      setRecipientProfile(
                        null
                      );
                    }}
                    placeholder={
                      sendMethod === "arivo"
                        ? "ARV-XXXX-XXXX"
                        : "0x..."
                    }
                    disabled={
                      loading ||
                      lookingUp
                    }
                    className="h-[58px] w-full rounded-xl border border-[#303030] bg-[#202020] px-4 pr-12 text-[15px] text-white outline-none transition placeholder:text-zinc-600 focus:border-[#777] disabled:opacity-50"
                  />

                  {recipient && (
                    <button
                      type="button"
                      onClick={() =>
                        setRecipient("")
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 transition hover:text-white"
                    >
                      <X size={17} />
                    </button>
                  )}

                </div>
              </div>

              {/* AMOUNT */}

              <div className="mb-5">

                <div className="mb-2 flex items-center justify-between">

                  <label className="text-[13px] font-medium text-zinc-400">
                    Amount
                  </label>

                  <span className="text-[12px] text-zinc-500">
                    Available:{" "}
                    {Number(
                      availableBalance
                    ).toFixed(2)}{" "}
                    {selectedAsset}
                  </span>

                </div>

                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    disabled={
                      loading ||
                      lookingUp
                    }
                    className="h-[68px] w-full rounded-xl border border-[#303030] bg-[#202020] px-4 pr-[120px] text-[22px] font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-[#777] disabled:opacity-50"
                  />

                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">

                    <span className="text-sm font-medium text-zinc-400">
                      {selectedAsset}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAmount(
                          availableBalance
                        );
                        setError("");
                      }}
                      disabled={
                        loading ||
                        lookingUp ||
                        Number(
                          availableBalance
                        ) <= 0
                      }
                      className="rounded-md px-2 py-1 text-[12px] font-semibold text-[#f3ead7] transition hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      MAX
                    </button>

                  </div>
                </div>
              </div>

              {/* NETWORK */}

              <div className="mb-5 rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] px-4 py-3.5">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-[12px] text-zinc-500">
                      Network
                    </p>

                    <p className="mt-1 text-sm font-medium text-white">
                      Arc Testnet
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#292929] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400">
                    Testnet
                  </div>

                </div>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* CONTINUE */}

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  loading ||
                  lookingUp ||
                  !recipient.trim() ||
                  !amount ||
                  Number(amount) <= 0 ||
                  Number(amount) >
                    Number(
                      availableBalance
                    )
                }
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#f3ead7] text-[15px] font-semibold text-black transition hover:bg-[#eadfc9] disabled:cursor-not-allowed disabled:bg-[#55524c] disabled:text-black/60"
              >
                {lookingUp
                  ? "Checking..."
                  : "Continue"}

                {!lookingUp && (
                  <ArrowRight size={17} />
                )}
              </button>

            </div>
          </>
        ) : (
          <>
            {/* =================================================
                CONFIRMATION HEADER
            ================================================= */}

            <div className="flex items-center justify-between border-b border-[#292929] px-7 py-5">

              <div>
                <h2 className="text-[22px] font-semibold text-white">
                  Confirm Send
                </h2>

                <p className="mt-1 text-[12px] text-zinc-500">
                  Review the transaction before sending.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-white"
              >
                <X size={19} />
              </button>

            </div>

            {/* CONFIRMATION BODY */}

            <div className="px-7 pb-7 pt-6">

              {/* AMOUNT */}

              <div className="mb-5 text-center">

                <p className="text-[12px] text-zinc-500">
                  You are sending
                </p>

                <div className="mt-2 flex items-center justify-center gap-2">

                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
                    <img
                      src={
                        selectedAsset ===
                        "USDC"
                          ? "/usdc-logo.png"
                          : "/eurc-logo.png"
                      }
                      alt={selectedAsset}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <span className="text-[32px] font-semibold tracking-tight text-white">
                    {amount}
                  </span>

                  <span className="text-lg text-zinc-400">
                    {selectedAsset}
                  </span>

                </div>
              </div>

              {/* RECIPIENT */}

              <div className="rounded-xl border border-[#303030] bg-[#202020] p-4">

                <p className="text-[12px] text-zinc-500">
                  Recipient
                </p>

                {sendMethod === "arivo" &&
                recipientProfile ? (
                  <div className="mt-3 flex items-center gap-3">

                    {recipientProfile.avatar ? (
                      <img
                        src={
                          recipientProfile.avatar
                        }
                        alt={
                          recipientProfile.username
                        }
                        className="h-10 w-10 rounded-full border border-[#333] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] font-semibold text-white">
                        {recipientProfile.username
                          .replace(
                            "@",
                            ""
                          )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-white">
                        {recipientProfile.username.replace(
                          "@",
                          ""
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {
                          recipientProfile.arivo_id
                        }
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-3">

                    <p className="break-all text-sm text-white">
                      {recipient}
                    </p>

                    <Copy
                      size={16}
                      className="shrink-0 text-zinc-500"
                    />

                  </div>
                )}

              </div>

              {/* WALLET */}

              {sendMethod === "arivo" &&
              recipientProfile && (
                <div className="mt-3 rounded-xl border border-[#303030] bg-[#202020] p-4">

                  <p className="text-[12px] text-zinc-500">
                    Wallet
                  </p>

                  <p className="mt-1 text-sm text-zinc-300">
                    {shortRecipientWallet}
                  </p>

                </div>
              )}

              {/* NETWORK */}

              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#303030] bg-[#202020] px-4 py-3">

                <span className="text-sm text-zinc-500">
                  Network
                </span>

                <span className="text-sm font-medium text-white">
                  Arc Testnet
                </span>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* BUTTONS */}

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="h-[52px] flex-1 rounded-xl border border-[#303030] text-sm font-medium text-white transition hover:bg-[#242424] disabled:opacity-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmSend
                  }
                  disabled={loading}
                  className="h-[52px] flex-1 rounded-xl bg-[#f3ead7] text-sm font-semibold text-black transition hover:bg-[#eadfc9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Sending..."
                    : "Confirm & Send"}
                </button>

              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}