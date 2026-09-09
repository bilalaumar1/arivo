 "use client";

import { X, CircleDollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

type AddMoneyModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddMoneyModal({
  open,
  onClose,
}: AddMoneyModalProps) {
  const { t } = useI18n();

  if (!open) return null;

  function translateWithFallback(
    key: string,
    fallback: string
  ) {
    const value = t("common", key);
    return value === key ? fallback : value;
  }

  const addMoneyDescription = translateWithFallback(
    "addMoneyDescription",
    "Add funds to your Arivo wallet."
  );

  const getTestUSDC = translateWithFallback(
    "getTestUSDC",
    "Get Test USDC"
  );

  const getTestUSDCDescription = translateWithFallback(
    "getTestUSDCDescription",
    "Get test USDC from the Arc Testnet faucet."
  );

  const testUSDCDisclaimer = translateWithFallback(
    "testUSDCDisclaimer",
    "Test USDC has no real value and is for testing purposes only."
  );

  function handleGetTestUSDC() {
    window.open(
      "https://faucet.circle.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#2b2b2b] bg-[#181818] p-5 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {t("common", "addMoney")}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {addMoneyDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common", "close")}
            className="shrink-0 text-zinc-500 transition hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Faucet Card */}
        <div className="mt-6 rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5 sm:mt-8 sm:p-7">
          {/* Icon + Title */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl bg-[var(--arivo-primary)] text-black sm:h-[70px] sm:w-[70px]">
              <CircleDollarSign size={32} strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-white sm:text-xl">
                {getTestUSDC}
              </h3>

              <p className="mt-1 text-sm leading-5 text-zinc-500">
                {getTestUSDCDescription}
              </p>
            </div>
          </div>

          {/* Network */}
          <div className="mt-6 rounded-2xl border border-[#2b2b2b] bg-[#181818] px-4 py-4 sm:mt-7 sm:px-5">
            <p className="text-xs text-zinc-500">
              {t("common", "network")}
            </p>

            <p className="mt-1 text-base font-semibold text-white">
              Arc Testnet
            </p>
          </div>

          {/* Get USDC */}
          <button
            type="button"
            onClick={handleGetTestUSDC}
            className="mt-6 h-14 w-full rounded-2xl bg-[var(--arivo-primary)] px-4 text-base font-semibold text-black transition hover:opacity-90 sm:mt-7"
          >
            {getTestUSDC}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-5 px-2 text-center text-xs leading-6 text-zinc-600 sm:mt-7 sm:px-4">
          {testUSDCDisclaimer}
        </p>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-14 w-full rounded-2xl border border-[#2b2b2b] text-base font-medium text-white transition hover:bg-[#202020] sm:mt-7"
        >
          {t("common", "close")}
        </button>
      </div>
    </div>
  );
}
