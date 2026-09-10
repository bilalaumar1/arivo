"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  Eye,
  Lock,
  Loader2,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import USDCSubscribePanel from "./USDCSubscribePanel";
import EURCSubscribePanel from "./EURCSubscribePanel";
import useEarnPosition from "@/lib/contracts/lending/useEarnPosition";
import useEarn from "@/lib/contracts/lending/useEarn";

type EarnAsset = "USDC" | "EURC";

const ASSETS: Record<
  EarnAsset,
  {
    name: string;
    logo: string;
  }
> = {
  USDC: {
    name: "USD Coin",
    logo: "/usdc-logo.png",
  },
  EURC: {
    name: "Euro Coin",
    logo: "/eurc-logo.png",
  },
};

function fmt(value: string | number) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
}

function fmtEarn(value: string | number) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 5,
        maximumFractionDigits: 5,
      })
    : "0.00000";
}

function apy(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value > 1000) return "Variable";

  return `${value.toFixed(2)}%`;
}

function AssetLogo({ asset }: { asset: EarnAsset }) {
  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#252525]">
      <Image
        src={ASSETS[asset].logo}
        alt={asset}
        width={44}
        height={44}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function AssetCard({
  asset,
  position,
  onSubscribe,
  onWithdraw,
}: {
  asset: EarnAsset;
  position: {
    suppliedFormatted: string;
    earnedFormatted: string;
    apy: number;
  };
  onSubscribe: (asset: EarnAsset) => void;
  onWithdraw: (asset: EarnAsset) => void;
}) {
  const hasPosition = Number(position.suppliedFormatted) > 0;

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#2b2b2b] bg-[#1b1b1b]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <AssetLogo asset={asset} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-semibold">{asset}</h3>

                <p className="mt-1 text-[12px] text-zinc-500">
                  Put your {asset} balance to work
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                  APY
                </p>

                <p className="mt-1 text-[18px] font-semibold text-[#b7f35a]">
                  {apy(position.apy)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                  Your balance
                </p>

                <p className="mt-1 text-[20px] font-semibold">
                  {fmt(position.suppliedFormatted)}{" "}
                  <span className="text-[13px] font-medium text-zinc-500">
                    {asset}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                  Earned
                </p>

                <p className="mt-1 text-[20px] font-semibold text-[#b7f35a]">
                  +{fmtEarn(position.earnedFormatted)}{" "}
                  <span className="text-[13px] font-medium text-[#728743]">
                    {asset}
                  </span>
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                  Status
                </p>

                <p className="mt-1 inline-flex items-center gap-2 text-[13px] font-medium text-zinc-300">
                  <span className="h-2 w-2 rounded-full bg-[#b7f35a]" />

                  {hasPosition ? "Earning" : "Not subscribed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#2b2b2b] bg-[#181818] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Lock size={14} />

          Flexible access to your funds
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {hasPosition ? (
            <button
              type="button"
              onClick={() => onWithdraw(asset)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#383838] bg-[#202020] px-5 text-[13px] font-semibold text-white transition hover:border-[#4a4a4a] hover:bg-[#262626] sm:w-auto"
            >
              Withdraw
              <ArrowUpRight size={16} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onSubscribe(asset)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] px-5 text-[13px] font-semibold text-black transition hover:bg-white sm:w-auto"
          >
            Souscrire
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function WithdrawModal({
  asset,
  suppliedBalance,
  amount,
  setAmount,
  onClose,
  onMax,
  onConfirm,
  isPending,
  isSuccess,
  txHash,
  error,
}: {
  asset: EarnAsset;
  suppliedBalance: string;
  amount: string;
  setAmount: (value: string) => void;
  onClose: () => void;
  onMax: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isSuccess: boolean;
  txHash?: `0x${string}`;
  error: string;
}) {
  const numericAmount = Number(amount);
  const numericSupplied = Number(suppliedBalance);

  const isAmountValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= numericSupplied;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-[470px] overflow-hidden rounded-[26px] border border-[#303030] bg-[#171717] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#292929] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[18px] font-semibold">
              Withdraw {asset}
            </h2>

            <p className="mt-1 text-[12px] text-zinc-500">
              Withdraw your supplied {asset} from Earn.
            </p>
          </div>

          {!isPending ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#232323] hover:text-white"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="p-5 sm:p-6">
          {isSuccess ? (
            <div className="py-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#b7f35a]/10 text-[#b7f35a]">
                <CheckCircle2 size={30} />
              </div>

              <h3 className="mt-5 text-[20px] font-semibold">
                Withdrawal successful
              </h3>

              <p className="mt-2 text-[13px] leading-5 text-zinc-500">
                Your {asset} withdrawal has been confirmed on Arc Testnet.
              </p>

              {txHash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#303030] bg-[#202020] px-4 py-3 text-[12px] font-medium text-zinc-300 transition hover:bg-[#272727] hover:text-white"
                >
                  View transaction
                  <ArrowUpRight size={15} />
                </a>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#efe5d2] text-[13px] font-semibold text-black transition hover:bg-white"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-[#292929] bg-[#1d1d1d] p-4">
                <div className="flex items-center gap-3">
                  <AssetLogo asset={asset} />

                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-zinc-500">
                      Supplied balance
                    </p>

                    <p className="mt-1 text-[20px] font-semibold">
                      {fmt(suppliedBalance)}{" "}
                      <span className="text-[12px] text-zinc-500">
                        {asset}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="withdraw-amount"
                    className="text-[12px] font-medium text-zinc-400"
                  >
                    Amount to withdraw
                  </label>

                  <button
                    type="button"
                    onClick={onMax}
                    disabled={isPending || numericSupplied <= 0}
                    className="text-[12px] font-semibold text-[#b7f35a] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Max
                  </button>
                </div>

                <div className="flex h-14 items-center rounded-xl border border-[#333333] bg-[#111111] px-4 transition focus-within:border-[#555555]">
                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    disabled={isPending}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (!/^\d*\.?\d{0,6}$/.test(value)) {
                        return;
                      }

                      setAmount(value);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold outline-none placeholder:text-zinc-700 disabled:opacity-50"
                  />

                  <span className="ml-3 text-[13px] font-semibold text-zinc-500">
                    {asset}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
                  <span>Available to withdraw</span>
                  <span>
                    {fmt(suppliedBalance)} {asset}
                  </span>
                </div>
              </div>

              {isPending ? (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#303030] bg-[#1d1d1d] px-4 py-3 text-[12px] text-zinc-400">
                  <Loader2
                    size={17}
                    className="animate-spin text-[#b7f35a]"
                  />

                  <span>
                    Processing your {asset} withdrawal on Arc Testnet...
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] leading-5 text-red-400">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={onConfirm}
                disabled={!isAmountValid || isPending}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] text-[13px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#302f2c] disabled:text-zinc-600"
              >
                {isPending ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Withdraw
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EarnPage() {

  const {
    positions,
    isLoading,
    isError,
  } = useEarnPosition();

  const {
    withdraw,
    state,
    isPending,
    isSuccess,
    reset,
  } = useEarn();

  const usdc = positions.USDC;
  const eurc = positions.EURC;

  const totalValue =
    Number(usdc.suppliedFormatted) +
    Number(eurc.suppliedFormatted);

  const totalEarned =
    Number(usdc.earnedFormatted) +
    Number(eurc.earnedFormatted);

  const [withdrawAsset, setWithdrawAsset] =
    useState<EarnAsset | null>(null);

  const [subscribeAsset, setSubscribeAsset] =
    useState<EarnAsset | null>(null);

  const [withdrawAmount, setWithdrawAmount] =
    useState("");

  const [withdrawError, setWithdrawError] =
    useState("");

  const openSubscribe = (asset: EarnAsset) => {
    setSubscribeAsset(asset);
  };

  const closeSubscribe = () => {
    if (isPending) return;
    setSubscribeAsset(null);
    reset();
  };

  const openWithdraw = (asset: EarnAsset) => {
    setWithdrawAsset(asset);
    setWithdrawAmount("");
    setWithdrawError("");
    reset();
  };

  const closeWithdraw = () => {
    if (isPending) return;

    setWithdrawAsset(null);
    setWithdrawAmount("");
    setWithdrawError("");
    reset();
  };

  const currentPosition =
    withdrawAsset === "USDC"
      ? usdc
      : withdrawAsset === "EURC"
        ? eurc
        : null;

  const currentSuppliedBalance =
    currentPosition?.suppliedFormatted ?? "0";

  const handleMax = () => {
    setWithdrawAmount(currentSuppliedBalance);
    setWithdrawError("");
  };

  const handleWithdraw = async () => {
    if (!withdrawAsset) return;

    const numericAmount = Number(withdrawAmount);
    const numericSupplied = Number(currentSuppliedBalance);

    if (
      !withdrawAmount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setWithdrawError("Enter a valid withdrawal amount.");
      return;
    }

    if (numericAmount > numericSupplied) {
      setWithdrawError(
        `You can withdraw up to ${fmt(currentSuppliedBalance)} ${withdrawAsset}.`
      );
      return;
    }

    setWithdrawError("");

    try {
      await withdraw(withdrawAsset, withdrawAmount);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      setWithdrawError(message);
    }
  };

  useEffect(() => {
    if (!withdrawAsset) return;

    if (state.step === "error" && state.error) {
      setWithdrawError(state.error);
    }
  }, [state.step, state.error, withdrawAsset]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#111111] text-white">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-[#292929] px-6 sm:px-8">
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525] hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-[26px] font-semibold">
                Earn
              </h1>

              <p className="mt-1 whitespace-nowrap text-[13px] text-zinc-500">
                Put your stablecoins to work on Arc Testnet.
              </p>
            </div>
          </div>

          <Topbar variant="actions" />
        </header>

        {/* CONTENT */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8">
            <div className="mx-auto w-full max-w-[1180px]">

            <section className="rounded-[26px] border border-[#2b2b2b] bg-[#151515] p-5 sm:p-6 lg:p-7">
              <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-500">
                <span>Estimated Total Value</span>
                <Eye size={16} />
              </div>

              <div className="mt-2 flex items-end gap-3">
                <span className="text-[38px] font-semibold leading-none tracking-tight sm:text-[44px]">
                  {isLoading ? "—" : fmt(totalValue)}
                </span>

                <span className="pb-1 text-[15px] font-medium text-zinc-400">
                  USD
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 text-[12px]">
                <div>
                  <p className="text-zinc-600">Total deposited</p>

                  <p className="mt-1 font-medium text-zinc-300">
                    {isLoading ? "—" : fmt(totalValue)}
                  </p>
                </div>

                <div className="h-8 w-px bg-[#2b2b2b]" />

                <div>
                  <p className="text-zinc-600">Total earned</p>

                  <p className="mt-1 font-medium text-[#b7f35a]">
                    {isLoading ? "—" : `${fmtEarn(totalEarned)}`}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 space-y-4">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h2 className="text-[18px] font-semibold sm:text-[20px]">
                    Earn assets
                  </h2>

                  <p className="mt-1 text-[12px] text-zinc-600 sm:text-[13px]">
                    Choose a stablecoin to start earning.
                  </p>
                </div>

                {isError ? (
                  <span className="text-[11px] text-red-400">
                    Unable to refresh
                  </span>
                ) : null}
              </div>

              <AssetCard
                asset="USDC"
                position={usdc}
                onSubscribe={openSubscribe}
                onWithdraw={openWithdraw}
              />

              <AssetCard
                asset="EURC"
                position={eurc}
                onSubscribe={openSubscribe}
                onWithdraw={openWithdraw}
              />
            </section>

            <section className="mt-10">
              <h2 className="text-[20px] font-semibold">
                Let your stablecoins work for you
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-[#252525] bg-[#171717] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#222222] text-[#efe5d2]">
                    <Lock size={18} />
                  </div>

                  <h3 className="mt-5 text-[15px] font-semibold">
                    Always available
                  </h3>

                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    Keep access to your earning position and withdraw when
                    you need it.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#252525] bg-[#171717] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#222222] text-[#b7f35a]">
                    <CircleDollarSign size={18} />
                  </div>

                  <h3 className="mt-5 text-[15px] font-semibold">
                    Yield on stablecoins
                  </h3>

                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    Supply USDC or EURC into the lending pool and earn
                    variable interest.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#252525] bg-[#171717] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#222222] text-[#efe5d2]">
                    <Clock3 size={18} />
                  </div>

                  <h3 className="mt-5 text-[15px] font-semibold">
                    On-chain transparency
                  </h3>

                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    Your position is tracked directly from the Arc Testnet
                    lending pool.
                  </p>
                </div>
              </div>
            </section>
            </div>
          </div>
        </main>

      {subscribeAsset === "USDC" ? (
        <USDCSubscribePanel onClose={closeSubscribe} />
      ) : null}

      {subscribeAsset === "EURC" ? (
        <EURCSubscribePanel onClose={closeSubscribe} />
      ) : null}

      {withdrawAsset ? (
        <WithdrawModal
          asset={withdrawAsset}
          suppliedBalance={currentSuppliedBalance}
          amount={withdrawAmount}
          setAmount={setWithdrawAmount}
          onClose={closeWithdraw}
          onMax={handleMax}
          onConfirm={handleWithdraw}
          isPending={isPending}
          isSuccess={isSuccess}
          txHash={state.txHash}
          error={withdrawError}
        />
      ) : null}
      </main>
    </div>
  );
}