"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  Loader2,
  TrendingUp,
} from "lucide-react";

import useEarn from "@/lib/contracts/lending/useEarn";
import useEarnPosition from "@/lib/contracts/lending/useEarnPosition";

type Asset = "USDC" | "EURC";

const ASSETS: Asset[] = [
  "USDC",
  "EURC",
];

export default function EarnPanel() {
  const {
    supply,
    withdraw,
    state,
    isPending,
    isSuccess,
    isError,
    reset,
  } = useEarn();

  const {
    positions,
    isLoading: positionLoading,
    refetch,
  } = useEarnPosition();

  const [asset, setAsset] =
    useState<Asset>("USDC");

  const [amount, setAmount] =
    useState("");

  const [mode, setMode] =
    useState<"deposit" | "withdraw">(
      "deposit"
    );

  const currentPosition =
    positions[asset];

  const supplied =
    currentPosition?.suppliedFormatted ??
    "0.00";

  const earned =
    currentPosition?.earnedFormatted ??
    "0.00";

  const apy =
    currentPosition?.apy ?? 0;

  const hasPosition =
    currentPosition?.supplied >
    BigInt(0);

  const amountNumber =
    Number(amount);

  const isValidAmount =
    amount.trim().length > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0;

  const buttonDisabled =
    isPending ||
    !isValidAmount ||
    (mode === "withdraw" &&
      !hasPosition);

  const buttonLabel = useMemo(() => {
    if (isPending) {
      if (
        state.step ===
        "approving"
      ) {
        return "Approving...";
      }

      if (
        state.step ===
        "supplying"
      ) {
        return "Depositing...";
      }

      if (
        state.step ===
        "withdrawing"
      ) {
        return "Withdrawing...";
      }

      if (
        state.step ===
        "switching"
      ) {
        return "Switching network...";
      }

      return "Processing...";
    }

    return mode === "deposit"
      ? "Deposit"
      : "Withdraw";
  }, [
    isPending,
    mode,
    state.step,
  ]);

  /* ============================================================
     REFRESH POSITION AFTER SUCCESS
     ============================================================ */

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    void refetch();

    const timer =
      window.setTimeout(() => {
        reset();
      }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isSuccess,
    refetch,
    reset,
  ]);

  /* ============================================================
     CHANGE ASSET
     ============================================================ */

  function handleAssetChange(
    nextAsset: Asset
  ) {
    if (isPending) {
      return;
    }

    setAsset(nextAsset);
    setAmount("");
    reset();
  }

  /* ============================================================
     CHANGE MODE
     ============================================================ */

  function handleModeChange(
    nextMode:
      | "deposit"
      | "withdraw"
  ) {
    if (isPending) {
      return;
    }

    setMode(nextMode);
    setAmount("");
    reset();
  }

  /* ============================================================
     MAX
     ============================================================ */

  function handleMax() {
    if (mode === "withdraw") {
      if (
        currentPosition?.suppliedFormatted
      ) {
        setAmount(
          currentPosition.suppliedFormatted
        );
      }

      return;
    }

    /*
     * Deposit max is intentionally not
     * calculated here because the main
     * wallet balance is handled by the
     * existing BalanceCard / wallet layer.
     */
    setAmount("");
  }

  /* ============================================================
     SUBMIT
     ============================================================ */

  async function handleSubmit() {
    if (buttonDisabled) {
      return;
    }

    try {
      reset();

      if (mode === "deposit") {
        await supply(
          asset,
          amount.trim()
        );
      } else {
        await withdraw(
          asset,
          amount.trim()
        );
      }

      setAmount("");
    } catch {
      /*
       * useEarn already stores the
       * detailed error in state.
       */
    }
  }

  /* ============================================================
     TX URL
     ============================================================ */

  const transactionUrl =
    state.txHash
      ? `https://testnet.arcscan.app/tx/${state.txHash}`
      : "";

  /* ============================================================
     UI
     ============================================================ */

  return (
    <section className="w-full rounded-2xl border border-[#2b2b2b] bg-[#181818] p-5 text-[#efe5d2]">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#262626]">
              <TrendingUp
                size={18}
                strokeWidth={2}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold">
                Earn
              </h2>

              <p className="text-xs text-zinc-500">
                Put your stablecoins to work
              </p>
            </div>
          </div>
        </div>

        {/* APY */}
        <div className="rounded-xl border border-[#2b2b2b] bg-[#141414] px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            APY
          </p>

          <p className="text-sm font-semibold text-[#B7F35A]">
            {positionLoading
              ? "—"
              : `${apy.toFixed(2)}%`}
          </p>
        </div>
      </div>

      {/* ======================================================
          ASSET SELECTOR
      ====================================================== */}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {ASSETS.map((item) => {
          const active =
            asset === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() =>
                handleAssetChange(item)
              }
              disabled={isPending}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[#efe5d2] bg-[#efe5d2] text-[#111111]"
                  : "border-[#2b2b2b] bg-[#141414] text-zinc-400 hover:bg-[#202020]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {item}
                </span>

                {active && (
                  <CheckCircle2
                    size={16}
                    strokeWidth={2}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ======================================================
          POSITION
      ====================================================== */}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#2b2b2b] bg-[#141414] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Earn position
          </p>

          <p className="mt-1 text-lg font-semibold">
            {positionLoading
              ? "—"
              : `${supplied} ${asset}`}
          </p>
        </div>

        <div className="rounded-xl border border-[#2b2b2b] bg-[#141414] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Earned
          </p>

          <p className="mt-1 text-lg font-semibold text-[#B7F35A]">
            {positionLoading
              ? "—"
              : `+${earned} ${asset}`}
          </p>
        </div>
      </div>

      {/* ======================================================
          MODE SWITCH
      ====================================================== */}

      <div className="mt-5 grid grid-cols-2 rounded-xl border border-[#2b2b2b] bg-[#141414] p-1">
        <button
          type="button"
          onClick={() =>
            handleModeChange(
              "deposit"
            )
          }
          disabled={isPending}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            mode === "deposit"
              ? "bg-[#252525] text-[#efe5d2]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <ArrowDownToLine
            size={16}
          />

          Deposit
        </button>

        <button
          type="button"
          onClick={() =>
            handleModeChange(
              "withdraw"
            )
          }
          disabled={isPending}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            mode === "withdraw"
              ? "bg-[#252525] text-[#efe5d2]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <ArrowUpFromLine
            size={16}
          />

          Withdraw
        </button>
      </div>

      {/* ======================================================
          AMOUNT
      ====================================================== */}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs text-zinc-500">
            Amount
          </label>

          <button
            type="button"
            onClick={handleMax}
            disabled={
              isPending ||
              (mode ===
                "withdraw" &&
                !hasPosition)
            }
            className="text-xs font-medium text-[#efe5d2] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            MAX
          </button>
        </div>

        <div className="flex items-center rounded-xl border border-[#2b2b2b] bg-[#141414] px-4 py-3 focus-within:border-[#555]">
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amount}
            onChange={(event) => {
              setAmount(
                event.target.value
              );

              if (
                state.step !==
                "idle"
              ) {
                reset();
              }
            }}
            placeholder="0.00"
            disabled={isPending}
            className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-zinc-700"
          />

          <span className="ml-3 text-sm font-semibold text-zinc-400">
            {asset}
          </span>
        </div>

        {mode === "withdraw" &&
          hasPosition && (
            <p className="mt-2 text-xs text-zinc-500">
              Available to withdraw:{" "}
              <span className="text-zinc-300">
                {supplied} {asset}
              </span>
            </p>
          )}
      </div>

      {/* ======================================================
          ACTION
      ====================================================== */}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={buttonDisabled}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] px-4 py-3 text-sm font-semibold text-[#111111] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending && (
          <Loader2
            size={17}
            className="animate-spin"
          />
        )}

        {!isPending &&
          mode === "deposit" && (
            <ArrowDownToLine
              size={17}
            />
          )}

        {!isPending &&
          mode === "withdraw" && (
            <ArrowUpFromLine
              size={17}
            />
          )}

        {buttonLabel}
      </button>

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {isSuccess && (
        <div className="mt-4 rounded-xl border border-[#304426] bg-[#1b2618] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-[#B7F35A]"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#B7F35A]">
                {mode === "deposit"
                  ? "Deposit successful"
                  : "Withdrawal successful"}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Your transaction has been
                confirmed on Arc Testnet.
              </p>

              {transactionUrl && (
                <a
                  href={
                    transactionUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-[#efe5d2] hover:underline"
                >
                  View transaction
                  <ExternalLink
                    size={12}
                  />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {isError && (
        <div className="mt-4 rounded-xl border border-[#4a2b2b] bg-[#241818] p-4">
          <p className="text-sm font-semibold text-red-300">
            Transaction failed
          </p>

          <p className="mt-1 break-words text-xs text-zinc-400">
            {state.error ||
              "Something went wrong. Please try again."}
          </p>

          <button
            type="button"
            onClick={reset}
            className="mt-3 text-xs font-medium text-[#efe5d2] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          INFO
      ====================================================== */}

      {!isSuccess &&
        !isError && (
          <p className="mt-4 text-center text-[11px] leading-5 text-zinc-600">
            Deposited {asset} earns yield through
            the UnitFlow lending pool.
          </p>
        )}
    </section>
  );
}