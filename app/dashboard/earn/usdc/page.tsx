"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

import useEarnPosition from "@/lib/contracts/lending/useEarnPosition";
import useEarn from "@/lib/contracts/lending/useEarn";

import { getWalletBalance } from "@/lib/wallet";
import { usePrivy } from "@privy-io/react-auth";

export default function USDCSubscribePage() {
  const router = useRouter();
  const { user } = usePrivy();

  const { positions, isLoading: positionsLoading } =
    useEarnPosition();

  const { supply } = useEarn();

  const [amount, setAmount] = useState("");
  const [availableBalance, setAvailableBalance] =
    useState("0.00");

  const [accepted, setAccepted] = useState(false);

  const [loadingBalance, setLoadingBalance] =
    useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  // ============================================================
  // USDC APY
  // ============================================================

  const apy = positions?.USDC?.apy ?? 0;

  const formattedApy =
    Number.isFinite(apy) && apy > 0
      ? `${apy.toFixed(2)}%`
      : "—";

  // ============================================================
  // LOAD AVAILABLE USDC
  // ============================================================

  const loadBalance = useCallback(async () => {
    const walletAddress =
      user?.wallet?.address as
        | `0x${string}`
        | undefined;

    if (!walletAddress) {
      setAvailableBalance("0.00");
      setLoadingBalance(false);
      return;
    }

    try {
      setLoadingBalance(true);

      const balance =
        await getWalletBalance(walletAddress);

      const numericBalance = Number(balance);

      setAvailableBalance(
        Number.isFinite(numericBalance)
          ? numericBalance.toFixed(2)
          : "0.00"
      );
    } catch (loadError) {
      console.error(
        "Failed to load USDC balance:",
        loadError
      );

      setAvailableBalance("0.00");
    } finally {
      setLoadingBalance(false);
    }
  }, [user?.wallet?.address]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    const refresh = () => {
      void loadBalance();
    };

    window.addEventListener("refreshBalance", refresh);

    return () => {
      window.removeEventListener(
        "refreshBalance",
        refresh
      );
    };
  }, [loadBalance]);

  // ============================================================
  // AMOUNT
  // ============================================================

  const numericAmount = Number(amount);

  const isAmountValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= Number(availableBalance);

  // ============================================================
  // ESTIMATED DAILY EARNINGS
  // ============================================================

  const estimatedDailyEarnings = useMemo(() => {
    if (
      !isAmountValid ||
      !Number.isFinite(apy) ||
      apy <= 0
    ) {
      return "0.00";
    }

    const daily =
      (numericAmount * apy) / 100 / 365;

    return daily.toFixed(4);
  }, [
    amount,
    numericAmount,
    apy,
    isAmountValid,
  ]);

  // ============================================================
  // MAX
  // ============================================================

  function handleMax() {
    if (
      !availableBalance ||
      Number(availableBalance) <= 0
    ) {
      return;
    }

    setAmount(availableBalance);
    setError("");
  }

  // ============================================================
  // AMOUNT INPUT
  // ============================================================

  function handleAmountChange(
    value: string
  ) {
    setError("");

    if (value === "") {
      setAmount("");
      return;
    }

    // Only numbers + one decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    // Maximum 6 decimals
    const decimalPart = value.split(".")[1];

    if (
      decimalPart &&
      decimalPart.length > 6
    ) {
      return;
    }

    setAmount(value);
  }

  // ============================================================
  // CONFIRM
  // ============================================================

  async function handleConfirm() {
    setError("");

    if (!user?.wallet?.address) {
      setError(
        "Please connect your wallet before subscribing."
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
        "Insufficient USDC balance."
      );
      return;
    }

    if (!accepted) {
      setError(
        "Please accept the terms before continuing."
      );
      return;
    }

    try {
      setSubmitting(true);

      await supply(
        "USDC",
        amount
      );

      setSuccess(true);

      window.dispatchEvent(
        new Event("refreshBalance")
      );

      setTimeout(() => {
        router.push("/dashboard/earn");
      }, 1200);
    } catch (submitError) {
      console.error(
        "USDC supply failed:",
        submitError
      );

      const message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);

      setError(
        message ||
          "USDC subscription failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <Sidebar />

      {/* ========================================================
          MAIN
      ======================================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">

            {/* ==================================================
                BACK
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/earn")
              }
              className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to Earn
            </button>

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="mb-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#2b2b2b] bg-[#1b1b1b]">
                  <Image
  src="/usdc-logo.png"
  alt="USDC"
  width={48}
  height={48}
  className="h-full w-full object-cover"
/>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">
                      USDC
                    </h1>

                    <span className="rounded-full border border-[#303030] bg-[#1b1b1b] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Earn
                    </span>
                  </div>

                  <p className="mt-1 text-[12px] text-zinc-500 sm:text-[13px]">
                    Put your USDC to work
                    and earn variable interest.
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================================
                CONTENT GRID
            ================================================== */}

            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

              {/* ==================================================
                  LEFT — SUBSCRIBE FORM
              ================================================== */}

              <section className="rounded-[26px] border border-[#2b2b2b] bg-[#151515] p-5 sm:p-6 lg:p-7">

                {/* APY */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                      Current APY
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      {positionsLoading ? (
                        <div className="h-8 w-24 animate-pulse rounded-lg bg-[#242424]" />
                      ) : (
                        <span className="text-[28px] font-semibold text-[#b7f35a] sm:text-[32px]">
                          {formattedApy}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20251c] text-[#b7f35a]">
                    <Sparkles size={18} />
                  </div>
                </div>

                {/* ==================================================
                    AMOUNT
                ================================================== */}

                <div className="mt-8">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-medium text-zinc-400">
                      Amount to subscribe
                    </label>

                    <span className="text-[11px] text-zinc-600">
                      USDC
                    </span>
                  </div>

                  <div
                    className={`rounded-[20px] border bg-[#1b1b1b] px-4 py-4 transition sm:px-5 ${
                      error &&
                      (!amount ||
                        Number(amount) <= 0 ||
                        Number(amount) >
                          Number(
                            availableBalance
                          ))
                        ? "border-red-500/40"
                        : "border-[#303030]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(event) =>
                          handleAmountChange(
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                        disabled={submitting}
                        className="min-w-0 flex-1 bg-transparent text-[32px] font-semibold tracking-tight text-white outline-none placeholder:text-[#3b3b3b] sm:text-[38px]"
                      />

                      <span className="shrink-0 text-[14px] font-semibold text-zinc-400">
                        USDC
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#292929] pt-3">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                        <Wallet size={14} />
                        <span>
                          Available
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleMax}
                        disabled={
                          submitting ||
                          loadingBalance ||
                          Number(
                            availableBalance
                          ) <= 0
                        }
                        className="text-[11px] font-semibold text-[#b7f35a] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Max
                      </button>
                    </div>

                    <div className="mt-1 text-right text-[13px] font-medium text-zinc-300">
                      {loadingBalance
                        ? "Loading..."
                        : `${Number(
                            availableBalance
                          ).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} USDC`}
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    ESTIMATED EARNINGS
                ================================================== */}

                <div className="mt-5 rounded-[20px] border border-[#292929] bg-[#181818] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                        Estimated daily earnings
                      </p>

                      <p className="mt-2 text-[20px] font-semibold text-[#b7f35a] sm:text-[22px]">
                        +{estimatedDailyEarnings} USDC
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20251c] text-[#b7f35a]">
                      <ArrowRight size={17} />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-zinc-600">
                    Estimate based on the current
                    variable APY. Actual earnings may
                    change over time.
                  </p>
                </div>

                {/* ==================================================
                    INFO
                ================================================== */}

                <div className="mt-5 flex gap-3 rounded-[18px] border border-[#292929] bg-[#181818] p-4">
                  <div className="mt-0.5 shrink-0 text-zinc-500">
                    <Info size={16} />
                  </div>

                  <p className="text-[11px] leading-5 text-zinc-500">
                    Your USDC will be supplied to the
                    Arc Testnet lending pool. The APY is
                    variable and can change according to
                    market conditions.
                  </p>
                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error ? (
                  <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] leading-5 text-red-400">
                    {error}
                  </div>
                ) : null}

                {/* ==================================================
                    SUCCESS
                ================================================== */}

                {success ? (
                  <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#b7f35a]/20 bg-[#b7f35a]/[0.05] px-4 py-3">
                    <CheckCircle2
                      size={18}
                      className="shrink-0 text-[#b7f35a]"
                    />

                    <div>
                      <p className="text-[12px] font-semibold text-white">
                        USDC subscribed successfully
                      </p>

                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        Redirecting to your Earn position...
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* ==================================================
                    TERMS
                ================================================== */}

                <label className="mt-6 flex cursor-pointer items-start gap-3">
                  <button
                    type="button"
                    aria-label="Accept terms"
                    onClick={() =>
                      setAccepted((value) => !value)
                    }
                    disabled={submitting || success}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      accepted
                        ? "border-[#b7f35a] bg-[#b7f35a] text-black"
                        : "border-[#3a3a3a] bg-[#1a1a1a] text-transparent"
                    }`}
                  >
                    <CheckCircle2
                      size={13}
                      strokeWidth={3}
                    />
                  </button>

                  <span className="text-[11px] leading-5 text-zinc-500">
                    I understand that the APY is
                    variable and that lending positions
                    are subject to smart-contract and
                    protocol risks.
                  </span>
                </label>

                {/* ==================================================
                    CONFIRM BUTTON
                ================================================== */}

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={
                    submitting ||
                    success ||
                    !isAmountValid ||
                    !accepted
                  }
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] text-[13px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Processing...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 size={17} />
                      Confirmed
                    </>
                  ) : (
                    <>
                      Confirm
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </section>

              {/* ==================================================
                  RIGHT — PRODUCT DETAILS
              ================================================== */}

              <aside className="h-fit space-y-5">

                {/* PRODUCT */}
                <section className="rounded-[26px] border border-[#2b2b2b] bg-[#151515] p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                    Product
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#222222]">
                      <Image
                        src="/usdc-logo.png"
                        alt="USDC"
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="text-[15px] font-semibold">
                        USDC Earn
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Variable yield
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[12px] text-zinc-600">
                        Current APY
                      </span>

                      <span className="text-[13px] font-semibold text-[#b7f35a]">
                        {positionsLoading
                          ? "—"
                          : formattedApy}
                      </span>
                    </div>

                    <div className="h-px bg-[#262626]" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[12px] text-zinc-600">
                        Asset
                      </span>

                      <span className="text-[12px] font-medium text-zinc-300">
                        USDC
                      </span>
                    </div>

                    <div className="h-px bg-[#262626]" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[12px] text-zinc-600">
                        Network
                      </span>

                      <span className="text-[12px] font-medium text-zinc-300">
                        Arc Testnet
                      </span>
                    </div>

                    <div className="h-px bg-[#262626]" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[12px] text-zinc-600">
                        Access
                      </span>

                      <span className="text-[12px] font-medium text-zinc-300">
                        Flexible
                      </span>
                    </div>
                  </div>
                </section>

                {/* BENEFITS */}
                <section className="rounded-[26px] border border-[#2b2b2b] bg-[#151515] p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#20251c] text-[#b7f35a]">
                      <ShieldCheck size={17} />
                    </div>

                    <div>
                      <p className="text-[13px] font-semibold">
                        Earn with your USDC
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-600">
                        Simple on-chain lending
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b7f35a]" />

                      <p className="text-[11px] leading-5 text-zinc-500">
                        Your supplied balance is tracked
                        directly on-chain.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b7f35a]" />

                      <p className="text-[11px] leading-5 text-zinc-500">
                        Interest is variable and depends
                        on the lending pool.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b7f35a]" />

                      <p className="text-[11px] leading-5 text-zinc-500">
                        You can manage your position from
                        the Earn page.
                      </p>
                    </div>
                  </div>
                </section>

                {/* WALLET */}
                <section className="rounded-[26px] border border-[#2b2b2b] bg-[#151515] p-5">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Wallet size={15} />

                    <span className="text-[11px] uppercase tracking-[0.1em]">
                      Wallet
                    </span>
                  </div>

                  <p className="mt-3 break-all text-[11px] leading-5 text-zinc-600">
                    {user?.wallet?.address ??
                      "No wallet connected"}
                  </p>
                </section>
              </aside>
            </div>

            {/* ==================================================
                FOOT NOTE
            ================================================== */}

            <div className="mt-7 flex items-start gap-2 px-1 text-[10px] leading-5 text-zinc-700">
              <ShieldCheck
                size={13}
                className="mt-0.5 shrink-0"
              />

              <p>
                Yield figures shown here are estimates
                based on the current variable lending rate.
                They are not guaranteed.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}