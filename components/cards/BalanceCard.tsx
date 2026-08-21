"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatUnits } from "viem";

import { getWalletBalance } from "@/lib/wallet";
import { publicClient } from "@/lib/publicClient";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

const erc20BalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const;

type Asset = "USDC" | "EURC";

export default function BalanceCard() {
  const { user } = usePrivy();

  const [selectedAsset, setSelectedAsset] =
    useState<Asset>("USDC");

  const [usdcBalance, setUsdcBalance] =
    useState("0.00");

  const [eurcBalance, setEurcBalance] =
    useState("0.00");

  const [openAssetMenu, setOpenAssetMenu] =
    useState(false);

  const [showBalance, setShowBalance] =
    useState(true);

  const loadBalances = useCallback(async () => {
    if (!user?.wallet?.address) return;

    const address =
      user.wallet.address as `0x${string}`;

    try {
      // =========================
      // USDC
      // =========================

      const usdc =
        await getWalletBalance(address);

      setUsdcBalance(usdc);

      // =========================
      // EURC
      // =========================

      const eurcRaw =
        await publicClient.readContract({
          address: EURC_ADDRESS,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [address],
        });

      const eurc =
        formatUnits(eurcRaw, 6);

      setEurcBalance(eurc);
    } catch (error) {
      console.error(
        "Failed to load balances:",
        error
      );
    }
  }, [user]);

  // =========================
  // Initial balance load
  // =========================

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // =========================
  // Refresh after transaction
  // =========================

  useEffect(() => {
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
  }, [loadBalances]);

  // =========================
  // Auto refresh
  // =========================

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const interval = setInterval(() => {
      loadBalances();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user, loadBalances]);

  // =========================
  // Selected balance
  // =========================

  const balance =
    selectedAsset === "USDC"
      ? usdcBalance
      : eurcBalance;

  const formattedBalance =
    Number(balance).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  // =========================
  // Hide balance
  // =========================

  const displayBalance = showBalance
    ? formattedBalance
    : "••••••";

  return (
    <div className="w-full rounded-[26px] border border-[#2d2d2d] bg-[#181818] px-10 py-8">

      <div className="flex items-start justify-between">

        {/* =========================
            LEFT SIDE
        ========================= */}

        <div>

          {/* Total Balance */}

          <p className="text-[13px] font-medium text-zinc-500">
            Total Balance
          </p>

          {/* =========================
              BALANCE + ASSET + EYE
          ========================= */}

          <h2 className="mt-2 flex items-end font-bold tracking-tight text-white">

            {/* Fixed balance area */}
            {/* This keeps USDC/EURC + Eye
                in the exact same position */}

            <span className="inline-flex w-[135px] shrink-0 items-center text-[36px] leading-none">
              {displayBalance}
            </span>

            {/* =========================
                USDC / EURC SELECTOR
            ========================= */}

            <div className="relative ml-[-18px] mb-1">

              <button
                type="button"
                onClick={() =>
                  setOpenAssetMenu(
                    (prev) => !prev
                  )
                }
                className="flex items-center gap-1 text-[18px] font-medium text-zinc-400 transition hover:text-white"
              >
                {selectedAsset}

                <ChevronDown
                  size={15}
                  strokeWidth={2}
                  className={`transition-transform ${
                    openAssetMenu
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {/* =========================
                  ASSET DROPDOWN
              ========================= */}

              {openAssetMenu && (
                <div className="absolute left-0 top-full z-50 mt-3 w-[150px] overflow-hidden rounded-xl border border-[#353535] bg-[#202020] p-1 shadow-2xl">

                  {/* USDC */}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAsset("USDC");
                      setOpenAssetMenu(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-[#2a2a2a]"
                  >

                    <div className="text-left">

                      <p className="text-[13px] font-medium text-white">
                        USDC
                      </p>

                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {Number(
                          usdcBalance
                        ).toFixed(2)}
                      </p>

                    </div>

                    {selectedAsset ===
                      "USDC" && (
                      <Check
                        size={15}
                        className="text-zinc-300"
                      />
                    )}

                  </button>

                  {/* EURC */}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAsset("EURC");
                      setOpenAssetMenu(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-[#2a2a2a]"
                  >

                    <div className="text-left">

                      <p className="text-[13px] font-medium text-white">
                        EURC
                      </p>

                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {Number(
                          eurcBalance
                        ).toFixed(2)}
                      </p>

                    </div>

                    {selectedAsset ===
                      "EURC" && (
                      <Check
                        size={15}
                        className="text-zinc-300"
                      />
                    )}

                  </button>

                </div>
              )}

            </div>

            {/* =========================
                EYE BUTTON
            ========================= */}

            <button
              type="button"
              onClick={() =>
                setShowBalance(
                  (prev) => !prev
                )
              }
              aria-label={
                showBalance
                  ? "Hide balance"
                  : "Show balance"
              }
              className="ml- mb-1 flex h-6 w-6 shrink-0 items-center justify-center text-zinc-500 transition hover:text-white"
            >

              {showBalance ? (
                <Eye
                  size={17}
                  strokeWidth={2}
                />
              ) : (
                <EyeOff
                  size={17}
                  strokeWidth={2}
                />
              )}

            </button>

          </h2>

          {/* =========================
              AVAILABLE / ON HOLD
          ========================= */}

          <div className="mt-7 flex gap-14">

            {/* Available */}

            <div>

              <p className="text-[12px] text-zinc-500">
                Available
              </p>

              <p className="mt-1 text-[16px] font-semibold text-white">
                {showBalance
                  ? `${formattedBalance} ${selectedAsset}`
                  : `•••••• ${selectedAsset}`}
              </p>

            </div>

            {/* On Hold */}

            <div>

              <p className="text-[12px] text-zinc-500">
                On Hold
              </p>

              <p className="mt-1 text-[16px] font-semibold text-white">
                {showBalance
                  ? `0.00 ${selectedAsset}`
                  : `•••• ${selectedAsset}`}
              </p>

            </div>

          </div>

        </div>

        {/* =========================
            ARIVO LOGO
        ========================= */}

        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-[var(--arivo-primary)]">

          <Image
            src="/arivo-icon-black.png"
            alt="Arivo"
            width={60}
            height={60}
            className="h-[60px] w-auto object-contain"
            priority
          />

        </div>

      </div>

    </div>
  );
}