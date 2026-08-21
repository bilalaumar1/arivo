"use client";

import { X, CircleDollarSign } from "lucide-react";

type AddMoneyModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddMoneyModal({
  open,
  onClose,
}: AddMoneyModalProps) {
  if (!open) return null;

  function handleGetTestUSDC() {
    window.open(
      "https://faucet.circle.com/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-[#2b2b2b] bg-[#181818] p-8 shadow-2xl">

        {/* Header */}

        <div className="flex items-start justify-between">

          <div>
            <h2 className="text-3xl font-bold text-white">
              Add Money
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Get test USDC for your Arivo wallet on Arc Testnet.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 transition hover:text-white"
          >
            <X size={22} />
          </button>

        </div>

        {/* Faucet Card */}

        <div className="mt-8 rounded-2xl border border-[#2b2b2b] bg-[#202020] p-7">

          {/* Icon + Title */}

          <div className="flex items-center gap-5">

            <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-2xl bg-[var(--arivo-primary)] text-black">
              <CircleDollarSign
                size={34}
                strokeWidth={2}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white">
                Get Test USDC
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Receive test USDC from the Circle Faucet.
              </p>
            </div>

          </div>

          {/* Network */}

          <div className="mt-7 rounded-2xl border border-[#2b2b2b] bg-[#181818] px-5 py-4">

            <p className="text-xs text-zinc-500">
              Network
            </p>

            <p className="mt-1 text-base font-semibold text-white">
              Arc Testnet
            </p>

          </div>

          {/* Get USDC */}

          <button
            onClick={handleGetTestUSDC}
            className="mt-7 h-14 w-full rounded-2xl bg-[var(--arivo-primary)] text-base font-semibold text-black transition hover:opacity-90"
          >
            Get Test USDC
          </button>

        </div>

        {/* Disclaimer */}

        <p className="mt-7 px-4 text-center text-xs leading-6 text-zinc-600">
          Test USDC has no real-world value and is only used for
          testing on Arc Testnet.
        </p>

        {/* Close */}

        <button
          onClick={onClose}
          className="mt-7 h-14 w-full rounded-2xl border border-[#2b2b2b] text-base font-medium text-white transition hover:bg-[#202020]"
        >
          Close
        </button>

      </div>
    </div>
  );
}