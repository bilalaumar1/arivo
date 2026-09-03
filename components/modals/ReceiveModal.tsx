"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import QRCode from "react-qr-code";

import { getProfile } from "@/lib/profile";

type ReceiveModalProps = {
  open: boolean;
  onClose: () => void;
};

type ReceiveMethod = "arivo" | "wallet";

export default function ReceiveModal({
  open,
  onClose,
}: ReceiveModalProps) {
  const { user } = usePrivy();

  const [receiveMethod, setReceiveMethod] =
    useState<ReceiveMethod>("arivo");

  const [arivoId, setArivoId] = useState("");
  const [copied, setCopied] = useState(false);

  const wallet = user?.wallet?.address ?? "";

  useEffect(() => {
    async function loadProfile() {
      if (!open || !wallet) return;

      const profile = await getProfile(wallet);

      if (profile?.arivo_id) {
        setArivoId(profile.arivo_id);
      }
    }

    loadProfile();
  }, [open, wallet]);

  useEffect(() => {
    setCopied(false);
  }, [receiveMethod]);

  if (!open) return null;

  const currentValue =
    receiveMethod === "arivo"
      ? arivoId
      : wallet;

  const qrValue = currentValue || "ARIVO";

  async function handleCopy() {
    if (!currentValue) return;

    await navigator.clipboard.writeText(currentValue);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">

      <div className="w-full max-w-lg rounded-3xl border border-[#2b2b2b] bg-[#181818] p-6 shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between">

          <h2 className="text-xl font-bold text-white">
            Receive USDC
          </h2>

          <button
            onClick={onClose}
            className="text-xl text-zinc-500 transition hover:text-white"
          >
            ×
          </button>

        </div>

        <p className="mt-1.5 text-sm leading-5 text-zinc-500">
          Choose how you want to receive USDC.
        </p>

        {/* Receive Method */}

        <div className="mt-5 grid grid-cols-2 gap-2.5">

          <button
            onClick={() => setReceiveMethod("arivo")}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              receiveMethod === "arivo"
                ? "border-[var(--arivo-primary)] bg-[var(--arivo-primary)] text-black"
                : "border-[#2b2b2b] bg-[#202020] text-white hover:bg-[#252525]"
            }`}
          >
            <p className="text-sm font-semibold">
              Arivo ID
            </p>

            <p
              className={`mt-1 text-xs ${
                receiveMethod === "arivo"
                  ? "text-black/60"
                  : "text-zinc-500"
              }`}
            >
              Easy to share
            </p>
          </button>

          <button
            onClick={() => setReceiveMethod("wallet")}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              receiveMethod === "wallet"
                ? "border-[var(--arivo-primary)] bg-[var(--arivo-primary)] text-black"
                : "border-[#2b2b2b] bg-[#202020] text-white hover:bg-[#252525]"
            }`}
          >
            <p className="text-sm font-semibold">
              Wallet Address
            </p>

            <p
              className={`mt-1 text-xs ${
                receiveMethod === "wallet"
                  ? "text-black/60"
                  : "text-zinc-500"
              }`}
            >
              Direct on-chain transfer
            </p>
          </button>

        </div>

        {/* Description */}

        <p className="mt-4 text-sm text-zinc-500">
          {receiveMethod === "arivo"
            ? "Share your Arivo ID to receive USDC on Arivo."
            : "Share your wallet address to receive USDC on Arc Testnet."}
        </p>

        {/* QR Code */}

        <div className="mt-5 flex justify-center">

          <div className="rounded-2xl bg-white p-3">

            <QRCode
              value={qrValue}
              size={160}
            />

          </div>

        </div>

        {/* Value */}

        <div className="mt-5">

          <label className="mb-1.5 block text-sm text-zinc-400">
            {receiveMethod === "arivo"
              ? "Arivo ID"
              : "Wallet Address"}
          </label>

          <div className="rounded-xl border border-[#2b2b2b] bg-[#202020] p-3.5">

            <p
              className={`text-white ${
                receiveMethod === "arivo"
                  ? "text-center text-base font-semibold tracking-wide"
                  : "break-all text-[12px]"
              }`}
            >
              {currentValue || "Loading..."}
            </p>

          </div>

        </div>

        {/* Buttons */}

        <div className="mt-5 flex gap-2.5">

          <button
            onClick={handleCopy}
            disabled={!currentValue}
            className="h-10 flex-1 rounded-xl bg-[var(--arivo-primary)] text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied
              ? "Copied!"
              : receiveMethod === "arivo"
              ? "Copy Arivo ID"
              : "Copy Address"}
          </button>

          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-[#2b2b2b] text-sm text-white transition hover:bg-[#202020]"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
}