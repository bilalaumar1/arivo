"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { sendUSDC } from "@/lib/sendUSDC";
import { sendEURC } from "@/lib/sendEURC";
import { getProfileByArivoId } from "@/lib/profile";
import { useToast } from "../toast/ToastProvider";
import { publicClient } from "@/lib/publicClient";
import { createNotification } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n/useI18n";

import {
  formatUnits,
  parseUnits,
  erc20Abi,
  type Address,
} from "viem";

import {
  ArrowLeft,
  Wallet,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Asset = {
  symbol: "USDC" | "EURC";
  name: string;
  logo: string;
};

const assets: Asset[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    logo: "/usdc-logo.png",
  },
  {
    symbol: "EURC",
    name: "Euro Coin",
    logo: "/eurc-logo.png",
  },
];

const TOKEN_ADDRESSES = {
  USDC:
    "0x3600000000000000000000000000000000000000" as Address,
  EURC:
    "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address,
} as const;

export default function SendPage() {
  const { user } = usePrivy();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();

  const [method, setMethod] = useState<"arivo" | "wallet">("arivo");

  const [asset, setAsset] = useState<Asset>(assets[0]);

  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [eurcBalance, setEurcBalance] = useState("0.00");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [openAsset, setOpenAsset] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState("");

  const [recipientProfile, setRecipientProfile] = useState<{
    username: string;
    avatar: string;
    wallet: string;
    arivo_id: string;
  } | null>(null);

  const [networkFee, setNetworkFee] = useState("—");
  const [feeLoading, setFeeLoading] = useState(false);

  // =========================================================
  // LOAD RECIPIENT FROM CHAT
  // /send?address=0x...
  // =========================================================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const address = params.get("address");

    if (!address) return;

    const trimmedAddress = address.trim();

    if (
      trimmedAddress.startsWith("0x") &&
      trimmedAddress.length === 42
    ) {
      setMethod("wallet");
      setRecipient(trimmedAddress);
      setError("");
      setShowConfirmation(false);
    }
  }, []);

  // =========================================================
  // LOAD BALANCES
  // =========================================================

  const loadBalances = useCallback(async () => {
    const address =
      user?.wallet?.address as `0x${string}` | undefined;

    if (!address) {
      setUsdcBalance("0.00");
      setEurcBalance("0.00");
      return;
    }

    try {
      /*
       * Arc has one underlying USDC balance.
       * Read the native balance instead of calling
       * USDC.balanceOf() on the public RPC.
       *
       * Native USDC uses 18 decimals on Arc.
       * The UI/send amount uses the ERC-20 6-decimal representation.
       */
      const nativeUsdc = await publicClient.getBalance({
        address,
      });

      setUsdcBalance(
        Number(formatUnits(nativeUsdc, 18)).toFixed(2)
      );

      /*
       * Only query EURC when it is actually selected.
       * This avoids an unnecessary eth_call on every page load.
       */
      if (asset.symbol === "EURC") {
        const eurcRaw = await publicClient.readContract({
          address: TOKEN_ADDRESSES.EURC,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        });

        setEurcBalance(
          Number(formatUnits(eurcRaw, 6)).toFixed(2)
        );
      }
    } catch (error) {
      console.error("Failed to load wallet balance:", error);

      /*
       * Keep the last known balance if the public RPC
       * is temporarily rate-limited.
       */
    }
  }, [user?.wallet?.address, asset.symbol]);

  useEffect(() => {
    loadBalances();

    const refresh = () => {
      void loadBalances();
    };

    window.addEventListener("refreshBalance", refresh);

    return () => {
      window.removeEventListener("refreshBalance", refresh);
    };
  }, [loadBalances]);

  // =========================================================
  // BALANCE
  // =========================================================

  const availableBalance =
    asset.symbol === "USDC"
      ? usdcBalance
      : eurcBalance;

  const isValid =
    recipient.trim().length > 0 &&
    Number(amount) > 0 &&
    Number(amount) <= Number(availableBalance);

  function handleMax() {
    setAmount(availableBalance);
    setError("");
  }

  // =========================================================
  // NETWORK FEE
  // =========================================================

  async function estimateNetworkFee(
    walletAddress: `0x${string}`
  ) {
    if (
      !user?.wallet?.address ||
      !amount ||
      Number(amount) <= 0
    ) {
      setNetworkFee("—");
      return;
    }

    try {
      setFeeLoading(true);

      const tokenAddress = TOKEN_ADDRESSES[asset.symbol];

      const amountUnits = parseUnits(amount, 6);

      const gas = await publicClient.estimateContractGas({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [walletAddress, amountUnits],
        account: user.wallet.address as Address,
      });

      const gasPrice = await publicClient.getGasPrice();

      // Arc Testnet uses USDC as native gas token.
      const fee = gas * gasPrice;

      setNetworkFee(
        Number(formatUnits(fee, 18)).toFixed(6)
      );
    } catch (error) {
      console.error("Failed to estimate network fee:", error);
      setNetworkFee("—");
    } finally {
      setFeeLoading(false);
    }
  }

  useEffect(() => {
    setNetworkFee("—");

    const trimmedRecipient = recipient.trim();

    const walletAddress =
      method === "arivo"
        ? recipientProfile?.wallet
        : trimmedRecipient;

    if (
      !walletAddress ||
      !walletAddress.startsWith("0x") ||
      walletAddress.length !== 42 ||
      !amount ||
      Number(amount) <= 0 ||
      Number(amount) > Number(availableBalance)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      estimateNetworkFee(
        walletAddress as `0x${string}`
      );
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    recipient,
    amount,
    asset.symbol,
    method,
    recipientProfile?.wallet,
    user?.wallet?.address,
    availableBalance,
  ]);

  // =========================================================
  // CONTINUE
  // =========================================================

  async function handleContinue() {
    setError("");

    if (!recipient.trim()) {
      const message =
        method === "arivo"
          ? t("common", "pleaseEnterArivoId")
          : t("common", "pleaseEnterWalletAddress");

      setError(message);
      toastError(t("common", "recipientRequired"), message);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      const message = t("common", "pleaseEnterValidAmount");
      setError(message);
      toastError(t("common", "invalidAmount"), message);
      return;
    }

    if (Number(amount) > Number(availableBalance)) {
      const message =
        `Insufficient balance. Available: ${availableBalance} ${asset.symbol}.`;

      setError(message);
      toastError(t("common", "insufficientBalance"), message);
      return;
    }

    try {
      setLookingUp(true);

      if (method === "arivo") {
        const arivoId = recipient.trim().toUpperCase();

        const foundProfile =
          await getProfileByArivoId(arivoId);

        if (!foundProfile) {
          const message = t("common", "arivoIdNotFound");
          setError(message);
          toastError(t("common", "recipientNotFound"), message);
          return;
        }

        if (!foundProfile.wallet) {
          const message = t("common", "arivoIdNoWallet");
          setError(message);
          toastError(t("common", "recipientUnavailable"), message);
          return;
        }

        setRecipientProfile({
          username: foundProfile.username,
          avatar: foundProfile.avatar ?? "",
          wallet: foundProfile.wallet,
          arivo_id: foundProfile.arivo_id ?? arivoId,
        });
      } else {
        const walletAddress = recipient.trim();

        if (
          !walletAddress.startsWith("0x") ||
          walletAddress.length !== 42
        ) {
          const message = t("common", "invalidWalletAddress");
          setError(message);
          toastError(t("common", "invalidWalletAddress"), message);
          return;
        }
      }

      setShowConfirmation(true);
    } catch (error) {
      console.error("Recipient lookup failed:", error);

      const message = t("common", "recipientLookupFailed");

      setError(message);
      toastError(t("common", "recipientLookupFailed"), message);
    } finally {
      setLookingUp(false);
    }
  }

  // =========================================================
  // CONFIRM SEND
  // =========================================================

  async function handleConfirmSend() {
    setError("");

    try {
      setLoading(true);

      let walletAddress = recipient.trim();

      if (method === "arivo") {
        if (!recipientProfile) {
          const message = t("common", "recipientProfileNotFound");
          setError(message);
          toastError(t("common", "recipientNotFound"), message);
          return;
        }

        walletAddress = recipientProfile.wallet;
      }

      if (
        !walletAddress.startsWith("0x") ||
        walletAddress.length !== 42
      ) {
        const message = t("common", "invalidWalletAddress");
        setError(message);
        toastError(t("common", "invalidWalletAddress"), message);
        return;
      }

      let hash: string;

      if (asset.symbol === "USDC") {
        hash = await sendUSDC(
          walletAddress as `0x${string}`,
          amount
        );
      } else {
        hash = await sendEURC(
          walletAddress as `0x${string}`,
          amount
        );
      }

      console.log(
        `${asset.symbol} Transaction Hash:`,
        hash
      );

      success(
        `${asset.symbol} ${t("common", "sentSuccessfully")}`,
        `${Number(amount).toFixed(2)} ${asset.symbol} ${t("common", "wasSentToRecipient")}`
      );

      // Create a notification for the sender.
      // This does not affect the transaction if notification creation fails.
      try {
        const senderAddress = user?.wallet?.address;

        if (senderAddress) {
          await createNotification({
            recipientAddress: senderAddress,
            type: "send",
            title: `${asset.symbol} sent`,
            message: `${Number(amount).toFixed(2)} ${asset.symbol} sent to ${walletAddress}`,
            transactionHash: hash,
            asset: asset.symbol,
            amount: Number(amount),
            senderAddress,
          });
        }
      } catch (notificationError) {
        console.error(
          "Failed to create send notification:",
          notificationError
        );
      }

      // Get the real transaction fee.
      try {
        const receipt =
          await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
          });

        const gasUsed = receipt.gasUsed;
        const effectiveGasPrice =
          receipt.effectiveGasPrice;

        if (
          gasUsed !== undefined &&
          effectiveGasPrice !== undefined
        ) {
          const actualFee =
            gasUsed * effectiveGasPrice;

          const actualFeeFormatted = Number(
            formatUnits(actualFee, 18)
          ).toFixed(6);

          console.log(
            "Actual Arc network fee:",
            actualFeeFormatted,
            "USDC"
          );

          setNetworkFee(actualFeeFormatted);
        }
      } catch (feeError) {
        console.error(
          "Failed to read actual transaction fee:",
          feeError
        );
      }

      setRecipient("");
      setAmount("");
      setRecipientProfile(null);
      setShowConfirmation(false);
      setError("");

      window.dispatchEvent(
        new Event("refreshBalance")
      );
    } catch (error) {
      console.error("Transaction failed:", error);

      setError(
        `${asset.symbol} ${t("common", "transactionFailedTryAgain")}`
      );

      toastError(
        `${asset.symbol} ${t("common", "transactionFailed")}`,
        t("common", "pleaseTryAgain")
      );

      // Create a notification for the failed transaction.
      // No transaction hash is used because the transaction may have failed
      // before a hash was returned.
      try {
        const senderAddress = user?.wallet?.address;

        if (senderAddress) {
          await createNotification({
            recipientAddress: senderAddress,
            type: "failed",
            title: `${asset.symbol} transaction failed`,
            message: `Your ${asset.symbol} transaction could not be completed.`,
            asset: asset.symbol,
            amount: Number(amount),
            senderAddress,
          });
        }
      } catch (notificationError) {
        console.error(
          "Failed to create failed-transaction notification:",
          notificationError
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-[#111111] text-white">

      {/* HEADER */}

      <header className="flex h-[88px] items-center border-b border-[#292929] px-8">

        <button
          type="button"
          onClick={() => window.history.back()}
          className="mr-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
        >
          <ArrowLeft size={19} />
        </button>

        <div>
          <h1 className="text-[26px] font-semibold">
            {t("common", "title")}
          </h1>

          <p className="mt-1 text-[13px] text-zinc-500">
            {t("common", "subtitle")}
          </p>
        </div>

      </header>

      {/* MAIN */}

      <main className="p-8">

        <div className="grid grid-cols-12 items-start gap-6">

          {/* LEFT */}

          <section className="col-span-12 lg:col-span-8">

            <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-7">

              <div className="mb-7">

                <h2 className="text-[18px] font-semibold">
                  {t("common", "sendFunds")}
                </h2>

                <p className="mt-1 text-[13px] text-zinc-500">
                  {t("common", "chooseRecipientAmount")}
                </p>

              </div>

              {/* SEND TO */}

              <div>

                <label className="mb-3 block text-[13px] text-zinc-400">
                  {t("common", "sendTo")}
                </label>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() => {
                      setMethod("arivo");
                      setRecipient("");
                      setRecipientProfile(null);
                      setError("");
                      setShowConfirmation(false);
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition lg:p-5 ${
                      method === "arivo"
                        ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                        : "border-[#353535] bg-[#202020] text-white hover:border-[#555]"
                    }`}
                  >
                    <p className="font-semibold">
                      Arivo ID
                    </p>

                    <p
                      className={`mt-1 text-[12px] ${
                        method === "arivo"
                          ? "text-zinc-600"
                          : "text-zinc-500"
                      }`}
                    >
                      {t("common", "sendToArivoUser")}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod("wallet");
                      setRecipientProfile(null);
                      setError("");
                      setShowConfirmation(false);
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition lg:p-5 ${
                      method === "wallet"
                        ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                        : "border-[#353535] bg-[#202020] text-white hover:border-[#555]"
                    }`}
                  >
                    <p className="font-semibold">
                      {t("common", "walletAddress")}
                    </p>

                    <p
                      className={`mt-1 text-[12px] ${
                        method === "wallet"
                          ? "text-zinc-600"
                          : "text-zinc-500"
                      }`}
                    >
                      {t("common", "sendToWallet")}
                    </p>
                  </button>

                </div>

              </div>

              {/* ASSET */}

              <div className="mt-7">

                <label className="mb-3 block text-[13px] text-zinc-400">
                  {t("common", "asset")}
                </label>

                <div className="relative">

                  <button
                    type="button"
                    onClick={() => setOpenAsset(!openAsset)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#353535] bg-[#202020] px-5 py-4 text-left transition hover:border-[#555]"
                  >

                    <div className="flex items-center gap-3">

                      <img
                        src={asset.logo}
                        alt={asset.symbol}
                        className="h-10 w-10 rounded-full"
                      />

                      <div>

                        <p className="font-semibold">
                          {asset.symbol}
                        </p>

                        <p className="text-[12px] text-zinc-500">
                          {asset.name}
                        </p>

                      </div>

                    </div>

                    <ChevronDown
                      size={18}
                      className="text-zinc-500"
                    />

                  </button>

                  {openAsset && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#353535] bg-[#202020] shadow-2xl">

                      {assets.map((item) => (

                        <button
                          type="button"
                          key={item.symbol}
                          onClick={() => {
                            setAsset(item);
                            setAmount("");
                            setError("");
                            setNetworkFee("—");
                            setShowConfirmation(false);
                            setRecipientProfile(null);
                            setOpenAsset(false);
                          }}
                          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#292929]"
                        >

                          <img
                            src={item.logo}
                            alt={item.symbol}
                            className="h-9 w-9 rounded-full"
                          />

                          <div>

                            <p className="font-semibold">
                              {item.symbol}
                            </p>

                            <p className="text-[12px] text-zinc-500">
                              {item.name}
                            </p>

                          </div>

                        </button>

                      ))}

                    </div>
                  )}

                </div>

              </div>

              {/* RECIPIENT */}

              <div className="mt-7">

                <label className="mb-3 block text-[13px] text-zinc-400">
                  {method === "arivo"
                    ? t("common", "arivoId")
                    : t("common", "walletAddress")}
                </label>

                <input
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setError("");
                    setShowConfirmation(false);
                  }}
                  placeholder={
                    method === "arivo"
                      ? "ARV-XXXX-XXXX"
                      : "0x..."
                  }
                  className="h-[62px] w-full rounded-2xl border border-[#353535] bg-[#202020] px-5 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-[#666]"
                />

              </div>

              {/* AMOUNT */}

              <div className="mt-7">

                <div className="mb-3 flex items-center justify-between">

                  <label className="text-[13px] text-zinc-400">
                    {t("common", "amount")}
                  </label>

                  <span className="text-[12px] text-zinc-500">
                    {t("common", "availableBalance")}{" "}
                    <span className="font-medium text-zinc-300">
                      {availableBalance} {asset.symbol}
                    </span>
                  </span>

                </div>

                <div className="flex h-[68px] items-center rounded-2xl border border-[#353535] bg-[#202020] px-5">

                  <input
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                      setShowConfirmation(false);
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent text-[20px] text-white outline-none placeholder:text-zinc-600"
                  />

                  <span className="mr-5 text-[13px] font-medium text-zinc-300">
                    {asset.symbol}
                  </span>

                  <button
                    type="button"
                    onClick={handleMax}
                    className="text-[13px] font-semibold text-[#efe5d2] hover:text-white"
                  >
                    {t("common", "max")}
                  </button>

                </div>

              </div>

              {/* NETWORK */}

              <div className="mt-7 flex items-center justify-between rounded-2xl border border-[#353535] bg-[#202020] px-5 py-4">

                <div>

                  <p className="text-[12px] text-zinc-500">
                    {t("common", "network")}
                  </p>

                  <p className="mt-1 text-[14px] font-semibold">
                    {t("common", "arcTestnet")}
                  </p>

                </div>

                <span className="rounded-lg bg-[#2b2b2b] px-3 py-2 text-[11px] text-zinc-400">
                  Testnet
                </span>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-300">
                  {error}
                </div>
              )}

              {/* CONTINUE */}

              <button
                type="button"
                disabled={!isValid || lookingUp}
                onClick={handleContinue}
                className={`mt-7 flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl font-semibold transition ${
                  isValid && !lookingUp
                    ? "bg-[#efe5d2] text-black hover:bg-white"
                    : "cursor-not-allowed bg-[#55524d] text-[#292825]"
                }`}
              >
                {lookingUp ? t("common", "checking") : t("common", "continue")}

                {!lookingUp && (
                  <span>→</span>
                )}
              </button>

            </div>

          </section>

          {/* RIGHT */}

          <aside className="col-span-12 space-y-5 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">

            {/* TRANSFER SUMMARY */}

            <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-[17px] font-semibold text-white">
                    {t("common", "transferSummary")}
                  </h2>

                  <p className="mt-1 text-[12px] text-zinc-600">
                    {t("common", "reviewTransferDetails")}
                  </p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#303030] bg-[#202020]">

                  <Wallet
                    size={18}
                    className="text-zinc-400"
                  />

                </div>

              </div>

              <div className="mt-6 space-y-5">

                {/* ASSET */}

                <div className="flex items-center justify-between gap-5">

                  <span className="text-[13px] text-zinc-500">
                    {t("common", "asset")}
                  </span>

                  <span className="text-[13px] font-semibold text-white">
                    {asset.symbol}
                  </span>

                </div>

                {/* RECIPIENT */}

                <div className="flex items-center justify-between gap-5">

                  <span className="text-[13px] text-zinc-500">
                    {t("common", "recipient")}
                  </span>

                  <span className="max-w-[190px] truncate text-right text-[13px] font-medium text-zinc-200">
                    {recipient || t("common", "notSelected")}
                  </span>

                </div>

                {/* AMOUNT */}

                <div className="flex items-center justify-between gap-5">

                  <span className="text-[13px] text-zinc-500">
                    {t("common", "amount")}
                  </span>

                  <span className="text-[13px] font-semibold text-white">
                    {Number(amount || 0).toFixed(2)}{" "}
                    {asset.symbol}
                  </span>

                </div>

                <div className="h-px bg-[#2a2a2a]" />

                {/* BALANCE */}

                <div className="flex items-center justify-between gap-5">

                  <span className="text-[13px] text-zinc-500">
                    {t("common", "availableBalance")}
                  </span>

                  <span className="text-[13px] font-medium text-zinc-300">
                    {Number(availableBalance || 0).toFixed(2)}{" "}
                    {asset.symbol}
                  </span>

                </div>

                {/* FEE */}

                <div className="flex items-center justify-between gap-5">

                  <span className="text-[13px] text-zinc-500">
                    {t("common", "networkFee")}
                  </span>

                  <span className="text-[13px] font-medium text-zinc-300">

                    {feeLoading
                      ? t("common", "estimating")
                      : networkFee === "—"
                        ? "—"
                        : `${networkFee} USDC`}

                  </span>

                </div>

                {/* YOU WILL SEND */}

                <div className="rounded-2xl border border-[#303030] bg-[#202020] px-4 py-4">

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-[12px] text-zinc-500">
                      {t("common", "youWillSend")}
                    </span>

                    <span className="text-[16px] font-semibold text-white">
                      {Number(amount || 0).toFixed(2)}{" "}
                      {asset.symbol}
                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* SECURE TRANSFER */}

            <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-6">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#303030] bg-[#242424]">

                  <CheckCircle2
                    size={18}
                    className="text-[#efe5d2]"
                  />

                </div>

                <div>

                  <h3 className="text-[14px] font-semibold text-white">
                    {t("common", "secureTransfer")}
                  </h3>

                  <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                    {t("common", "secureTransferDescription")}
                  </p>

                </div>

              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#2d2d2d] bg-[#202020] px-4 py-3">

                <span className="h-2 w-2 rounded-full bg-green-500" />

                <span className="text-[12px] font-medium text-zinc-300">
                  Arc Testnet
                </span>

                <span className="ml-auto text-[11px] font-medium text-green-500">
                  Connected
                </span>

              </div>

            </div>

          </aside>

        </div>

      </main>

      {/* CONFIRMATION MODAL */}

      {showConfirmation && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

          <div className="w-full max-w-[480px] rounded-[24px] border border-[#333] bg-[#191919] p-6 shadow-2xl">

            <div className="mb-6">

              <h2 className="text-[20px] font-semibold text-white">
                {t("common", "reviewTransfer")}
              </h2>

              <p className="mt-1 text-[13px] text-zinc-500">
                {t("common", "checkDetailsBeforeConfirming")}
              </p>

            </div>

            <div className="space-y-4 rounded-2xl border border-[#303030] bg-[#202020] p-5">

              <div className="flex items-center justify-between">

                <span className="text-[13px] text-zinc-500">
                  {t("common", "asset")}
                </span>

                <span className="text-[14px] font-semibold text-white">
                  {asset.symbol}
                </span>

              </div>

              <div className="flex items-center justify-between gap-5">

                <span className="text-[13px] text-zinc-500">
                  Recipient
                </span>

                <span className="max-w-[260px] truncate text-right text-[13px] text-white">

                  {method === "arivo" &&
                  recipientProfile
                    ? recipientProfile.arivo_id
                    : recipient}

                </span>

              </div>

              {method === "arivo" &&
                recipientProfile && (

                  <div className="flex items-center justify-between gap-5">

                    <span className="text-[13px] text-zinc-500">
                      {t("common", "wallet")}
                    </span>

                    <span className="max-w-[260px] truncate text-right text-[11px] text-zinc-400">
                      {recipientProfile.wallet}
                    </span>

                  </div>

                )}

              <div className="flex items-center justify-between border-t border-[#303030] pt-4">

                <span className="text-[13px] text-zinc-500">
                  Amount
                </span>

                <span className="text-[18px] font-semibold text-white">
                  {Number(amount || 0).toFixed(2)}{" "}
                  {asset.symbol}
                </span>

              </div>

            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowConfirmation(false);
                  setError("");
                }}
                className="h-[54px] rounded-2xl border border-[#353535] bg-[#202020] font-semibold text-white transition hover:bg-[#292929]"
              >
                {t("common", "back")}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmSend}
                className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#efe5d2] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading
                  ? t("common", "sending")
                  : t("common", "confirmSend")}

                {!loading && (
                  <ArrowRight size={17} />
                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}