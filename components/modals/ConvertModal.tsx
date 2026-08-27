"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft } from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  parseUnits,
  type Address,
} from "viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useToast } from "@/components/toast/ToastProvider";

const ARC_TESTNET_CHAIN_ID = 5042002;

const ARC_TESTNET = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
} as const;

const USDC =
  "0x3600000000000000000000000000000000000000" as Address;

const EURC =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;

type ConvertModalProps = {
  open: boolean;
  onClose: () => void;
};

type Currency = "USDC" | "EURC";

type QuoteResponse = {
  action: {
    fromChainId: number;
    toChainId: number;
    fromAmount: string;
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
    };
  };

  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
  };

  transactionRequest: {
    to: string;
    data: string;
    value?: string;
    gasLimit?: string;
  };

  tool?: string;
};

const TOKEN_CONFIG = {
  USDC: {
    address: USDC,
    decimals: 6,
    symbol: "USDC",
    logo: "/usdc-logo.png",
  },

  EURC: {
    address: EURC,
    decimals: 6,
    symbol: "EURC",
    logo: "/eurc-logo.png",
  },
} as const;

const publicClient = createPublicClient({
  chain: ARC_TESTNET,
  transport: http(
    "https://rpc.testnet.arc.network"
  ),
});

export default function ConvertModal({
  open,
  onClose,
}: ConvertModalProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { success: toastSuccess, error: toastError } = useToast();

  const [fromCurrency, setFromCurrency] =
    useState<Currency>("USDC");

  const [toCurrency, setToCurrency] =
    useState<Currency>("EURC");

  const [amount, setAmount] = useState("");

  const [step, setStep] = useState<
    "convert" | "review" | "success"
  >("convert");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [quote, setQuote] =
    useState<QuoteResponse | null>(null);

  const [txHash, setTxHash] =
    useState("");

  const [receiveAmount, setReceiveAmount] =
    useState("0.00");

  const fromToken =
    TOKEN_CONFIG[fromCurrency];

  const toToken =
    TOKEN_CONFIG[toCurrency];

  const previewRate = useMemo(() => {
    if (!quote) return null;

    const input = Number(amount);

    if (!input || input <= 0) {
      return null;
    }

    const output =
      Number(
        quote.estimate.toAmount
      ) /
      10 ** toToken.decimals;

    return output / input;
  }, [
    quote,
    amount,
    toToken.decimals,
  ]);

  if (!open) return null;

  function reset() {
    setAmount("");
    setStep("convert");
    setLoading(false);
    setError("");
    setQuote(null);
    setTxHash("");
    setReceiveAmount("0.00");
  }

  function handleClose() {
    if (loading) return;

    reset();
    onClose();
  }

  function handleSwapCurrencies() {
    const oldFrom = fromCurrency;

    setFromCurrency(toCurrency);
    setToCurrency(oldFrom);

    setAmount("");
    setQuote(null);
    setReceiveAmount("0.00");
    setError("");
    setStep("convert");
  }

  async function getQuote() {
    if (!user?.wallet?.address) {
      throw new Error(
        "Please connect your wallet first."
      );
    }

    if (fromCurrency === toCurrency) {
      throw new Error(
        "You cannot convert the same asset."
      );
    }

    const numericAmount =
      Number(amount);

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      throw new Error(
        "Enter a valid amount."
      );
    }

    const walletAddress =
      user.wallet.address;

    const fromAmount =
      parseUnits(
        amount,
        fromToken.decimals
      ).toString();

    const params =
      new URLSearchParams({
        fromChain:
          String(
            ARC_TESTNET_CHAIN_ID
          ),

        toChain:
          String(
            ARC_TESTNET_CHAIN_ID
          ),

        fromToken:
          fromToken.address,

        toToken:
          toToken.address,

        fromAddress:
          walletAddress,

        toAddress:
          walletAddress,

        fromAmount,

        slippage: "0.005",

        order: "CHEAPEST",
      });

    const response =
      await fetch(
        `https://li.quest/v1/quote?${params.toString()}`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "No swap route was found."
      );
    }

    if (
      !data?.estimate?.toAmount ||
      !data?.transactionRequest
    ) {
      throw new Error(
        "Invalid swap quote received."
      );
    }

    return data as QuoteResponse;
  }

  async function handleReview() {
    setError("");

    try {
      setLoading(true);

      const newQuote =
        await getQuote();

      setQuote(newQuote);

      const output =
        Number(
          newQuote.estimate.toAmount
        ) /
        10 ** toToken.decimals;

      setReceiveAmount(
        output.toFixed(2)
      );

      setStep("review");
    } catch (err) {
      console.error(
        "Quote failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to get a quote."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!quote) {
      setError(
        "Quote is missing. Please request a new quote."
      );
      return;
    }

    if (!user?.wallet?.address) {
      setError(
        "Please connect your wallet first."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const wallet =
        wallets.find(
          (w) =>
            w.address.toLowerCase() ===
            user.wallet?.address?.toLowerCase()
        ) ?? wallets[0];

      if (!wallet) {
        throw new Error(
          "No connected wallet found. Please connect your wallet first."
        );
      }

      const provider =
        await wallet.getEthereumProvider();

      if (!provider) {
        throw new Error(
          "Privy wallet provider not available."
        );
      }

      const walletClient =
        createWalletClient({
          chain: ARC_TESTNET,
          transport: custom(
            provider
          ),
        });

      const account =
        wallet.address as Address;

      const currentChain =
        await walletClient.getChainId();

      if (
        currentChain !==
        ARC_TESTNET_CHAIN_ID
      ) {
        await walletClient.switchChain({
          id: ARC_TESTNET_CHAIN_ID,
        });
      }

      const inputToken =
        fromToken.address;

      const balance =
        await publicClient.readContract({
          address: inputToken,
          abi: erc20Abi,
          functionName:
            "balanceOf",
          args: [account],
        });

      const requiredAmount =
        BigInt(
          quote.action.fromAmount
        );

      if (
        balance < requiredAmount
      ) {
        throw new Error(
          `Insufficient ${fromCurrency} balance. You need ${amount} ${fromCurrency}.`
        );
      }

      const approvalAddress =
        quote.estimate
          .approvalAddress as Address;

      if (!approvalAddress) {
        throw new Error(
          "Swap approval address was not provided."
        );
      }

      const allowance =
        await publicClient.readContract({
          address: inputToken,
          abi: erc20Abi,
          functionName:
            "allowance",
          args: [
            account,
            approvalAddress,
          ],
        });

      if (
        allowance < requiredAmount
      ) {
        const approvalHash =
          await walletClient.writeContract(
            {
              account,
              chain: ARC_TESTNET,
              address: inputToken,
              abi: erc20Abi,
              functionName:
                "approve",
              args: [
                approvalAddress,
                requiredAmount,
              ],
            }
          );

        await publicClient.waitForTransactionReceipt(
          {
            hash: approvalHash,
          }
        );
      }

      const tx =
        quote.transactionRequest;

      const hash =
        await walletClient.sendTransaction(
          {
            account,

            to: tx.to as Address,

            data:
              tx.data as `0x${string}`,

            value: BigInt(
              tx.value || "0"
            ),

            gas: tx.gasLimit
              ? BigInt(
                  tx.gasLimit
                )
              : undefined,
          }
        );

      const receipt =
        await publicClient.waitForTransactionReceipt(
          {
            hash,
          }
        );

      if (
        receipt.status !==
        "success"
      ) {
        throw new Error(
          "Swap transaction reverted."
        );
      }

      setTxHash(hash);

      toastSuccess(
        "Conversion successful",
        `${amount} ${fromCurrency} converted to ${receiveAmount} ${toCurrency}.`
      );

      window.dispatchEvent(
        new Event(
          "refreshBalance"
        )
      );

      window.dispatchEvent(
        new Event(
          "refreshTransactions"
        )
      );

      setStep("success");
    } catch (err) {
      console.error(
        "Conversion failed:",
        err
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Conversion failed.";

      setError(errorMessage);
      toastError("Conversion failed", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-[#2b2b2b] bg-[#181818] p-8 shadow-2xl">

        {/* ========================= */}
        {/* CONVERT */}
        {/* ========================= */}

        {step === "convert" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Convert
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Convert between supported stablecoins.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="text-2xl text-zinc-500 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* FROM */}

            <div className="mt-8">
              <label className="mb-2 block text-sm text-zinc-400">
                From
              </label>

              <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-4">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs text-zinc-500">
                      Asset
                    </p>

                    <div className="mt-1 flex items-center gap-2">

                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
                        <Image
                          src={
                            fromToken.logo
                          }
                          alt={
                            fromCurrency
                          }
                          width={32}
                          height={32}
                          className="h-8 w-8 object-contain"
                        />
                      </div>

                      <span className="text-lg font-semibold text-white">
                        {fromCurrency}
                      </span>

                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      You send
                    </p>

                    <p className="mt-1 text-lg font-semibold text-white">
                      {amount ||
                        "0.00"}
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* SWITCH */}

            <div className="relative flex justify-center">
              <button
                onClick={
                  handleSwapCurrencies
                }
                className="absolute z-10 -my-5 flex h-10 w-10 items-center justify-center rounded-full border border-[#353535] bg-[#181818] text-white hover:border-[#efe5d2]"
              >
                <ArrowDown
                  size={18}
                />
              </button>
            </div>

            {/* TO */}

            <div className="mt-5">
              <label className="mb-2 block text-sm text-zinc-400">
                To
              </label>

              <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-4">
                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs text-zinc-500">
                      Asset
                    </p>

                    <div className="mt-1 flex items-center gap-2">

                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
                        <Image
                          src={
                            toToken.logo
                          }
                          alt={
                            toCurrency
                          }
                          width={32}
                          height={32}
                          className="h-8 w-8 object-contain"
                        />
                      </div>

                      <span className="text-lg font-semibold text-white">
                        {toCurrency}
                      </span>

                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      You receive
                    </p>

                    <p className="mt-1 text-lg font-semibold text-white">
                      {receiveAmount}
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* AMOUNT */}

            <div className="mt-6">
              <label className="mb-2 block text-sm text-zinc-400">
                Amount
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(
                      e.target.value
                    );

                    setQuote(null);

                    setReceiveAmount(
                      "0.00"
                    );

                    setError("");
                  }}
                  placeholder="0.00"
                  className="h-14 w-full rounded-xl border border-[#2b2b2b] bg-[#202020] px-4 pr-20 text-lg text-white outline-none placeholder:text-zinc-600 focus:border-[#efe5d2]"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                  {fromCurrency}
                </span>
              </div>
            </div>

            {/* RATE */}

            <div className="mt-5 rounded-xl border border-[#2b2b2b] bg-[#202020] px-4 py-3">
              <div className="flex items-center justify-between">

                <span className="text-sm text-zinc-500">
                  Preview rate
                </span>

                <span className="text-sm font-medium text-white">
                  {previewRate
                    ? `1 ${fromCurrency} ≈ ${previewRate.toFixed(
                        6
                      )} ${toCurrency}`
                    : "Enter amount"}
                </span>

              </div>

              <p className="mt-1 text-[11px] text-zinc-600">
                Final rate comes from the live quote.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 flex gap-3">

              <button
                onClick={handleClose}
                className="h-12 flex-1 rounded-xl border border-[#2b2b2b] text-white hover:bg-[#202020]"
              >
                Cancel
              </button>

              <button
                onClick={handleReview}
                disabled={
                  loading ||
                  !amount ||
                  Number(amount) <= 0
                }
                className="h-12 flex-1 rounded-xl bg-[#efe5d2] font-semibold text-black hover:opacity-90 disabled:opacity-40"
              >
                {loading
                  ? "Getting Quote..."
                  : "Review Conversion"}
              </button>

            </div>
          </>
        )}

        {/* ========================= */}
        {/* REVIEW */}
        {/* ========================= */}

        {step === "review" && (
          <>
            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-2xl font-bold text-white">
                  Review Conversion
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  Check the quote before continuing.
                </p>
              </div>

              <button
                onClick={handleClose}
                disabled={loading}
                className="text-2xl text-zinc-500 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-8 rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs text-zinc-500">
                    You pay
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-white">
                    {amount}{" "}
                    {fromCurrency}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full">
                  <Image
                    src={
                      fromToken.logo
                    }
                    alt={
                      fromCurrency
                    }
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain"
                  />
                </div>

              </div>

              <div className="my-5 flex items-center gap-3">

                <div className="h-px flex-1 bg-[#353535]" />

                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#353535]">
                  <ArrowDown
                    size={15}
                    className="text-zinc-400"
                  />
                </div>

                <div className="h-px flex-1 bg-[#353535]" />

              </div>

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs text-zinc-500">
                    You receive
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-white">
                    {receiveAmount}{" "}
                    {toCurrency}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full">
                  <Image
                    src={
                      toToken.logo
                    }
                    alt={
                      toCurrency
                    }
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain"
                  />
                </div>

              </div>

            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5">

              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">
                  Rate
                </span>

                <span className="text-sm text-white">
                  {previewRate
                    ? `1 ${fromCurrency} ≈ ${previewRate.toFixed(
                        6
                      )} ${toCurrency}`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">
                  Network
                </span>

                <span className="text-sm text-white">
                  Arc Testnet
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">
                  Route
                </span>

                <span className="text-sm text-white">
                  {quote?.tool ||
                    "Swap"}
                </span>
              </div>

            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 flex gap-3">

              <button
                onClick={() =>
                  setStep("convert")
                }
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#2b2b2b] text-white hover:bg-[#202020]"
              >
                <ArrowLeft
                  size={17}
                />
                Back
              </button>

              <button
                onClick={
                  handleConfirm
                }
                disabled={loading}
                className="h-12 flex-1 rounded-xl bg-[#efe5d2] font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : "Confirm Conversion"}
              </button>

            </div>
          </>
        )}

        {/* ========================= */}
        {/* SUCCESS */}
        {/* ========================= */}

        {step === "success" && (
          <>
            <div className="flex items-center justify-between">

              <h2 className="text-2xl font-bold text-white">
                Conversion Complete
              </h2>

              <button
                onClick={handleClose}
                className="text-2xl text-zinc-500 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-8 flex flex-col items-center text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#efe5d2] text-2xl font-bold text-black">
                ✓
              </div>

              <h3 className="mt-5 text-xl font-semibold text-white">
                {amount}{" "}
                {fromCurrency}
              </h3>

              <p className="mt-1 text-zinc-500">
                → {receiveAmount}{" "}
                {toCurrency}
              </p>

              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 text-sm text-[#efe5d2] underline underline-offset-4 hover:text-white"
                >
                  View transaction on Arcscan
                </a>
              )}

              <p className="mt-5 text-sm text-zinc-500">
                Conversion confirmed on Arc Testnet.
              </p>

            </div>

            <button
              onClick={handleClose}
              className="mt-8 h-12 w-full rounded-xl bg-[#efe5d2] font-semibold text-black hover:opacity-90"
            >
              Done
            </button>

          </>
        )}

      </div>
    </div>
  );
}