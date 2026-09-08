"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";

import { getWalletBalance } from "@/lib/wallet";
import { publicClient } from "@/lib/publicClient";
import { useI18n } from "@/lib/i18n/useI18n";

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

export default function PortfolioCard() {
  const { user } = usePrivy();
  const { t } = useI18n();

  const [usdcBalance, setUsdcBalance] = useState("0");
  const [eurcBalance, setEurcBalance] = useState("0");

  const loadPortfolio = useCallback(async () => {
    if (!user?.wallet?.address) return;

    const address =
      user.wallet.address as `0x${string}`;

    try {
      // USDC
      const usdc = await getWalletBalance(address);

      // EURC
      const eurcRaw =
        await publicClient.readContract({
          address: EURC_ADDRESS,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [address],
        });

      const eurc = formatUnits(eurcRaw, 6);

      setUsdcBalance(usdc);
      setEurcBalance(eurc);
    } catch (error) {
      console.error(
        "Failed to load portfolio:",
        error
      );
    }
  }, [user?.wallet?.address]);

  // Initial load + refresh after transactions
  useEffect(() => {
    loadPortfolio();

    const refresh = () => {
      loadPortfolio();
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
  }, [loadPortfolio]);

  // Auto refresh every 5 seconds
  useEffect(() => {
    if (!user?.wallet?.address) return;

    const interval = setInterval(() => {
      loadPortfolio();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [
    user?.wallet?.address,
    loadPortfolio,
  ]);

  const usdc =
    Number(usdcBalance) || 0;

  const eurc =
    Number(eurcBalance) || 0;

  // USDC and EURC are both stablecoins,
  // so we use an approximate 1:1 USD value.
  const total = usdc + eurc;

  const usdcPercentage =
    total > 0
      ? (usdc / total) * 100
      : 0;

  const eurcPercentage =
    total > 0
      ? (eurc / total) * 100
      : 0;

  const formattedTotal =
    total >= 1000
      ? `$${(total / 1000).toFixed(2)}K`
      : `$${total.toFixed(2)}`;

  const usdcPercent =
    Math.round(usdcPercentage);

  const eurcPercent =
    Math.round(eurcPercentage);

  return (
    <div className="flex h-full min-h-[300px] flex-col rounded-[24px] border border-[#2b2b2b] bg-[#1a1a1a] p-5">

      {/* Header */}

      <div className="flex items-center justify-between">

        <h2 className="text-[17px] font-semibold text-white">
          {t("common", "portfolio")}
        </h2>

        <button
          type="button"
          className="text-[13px] font-medium text-[#efe5d2] transition hover:text-white"
        >
          {t("common", "details")}
        </button>

      </div>

      {/* Compact Donut */}

      <div className="mt-4 flex justify-center">

        <div className="relative flex h-[104px] w-[104px] items-center justify-center">

          {/* Outer chart */}

          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                total > 0
                  ? `conic-gradient(
                      #efe5d2 0% ${usdcPercentage}%,
                      #ffffff ${usdcPercentage}% 100%
                    )`
                  : "#333333",
            }}
          />

          {/* Inner circle */}

          <div className="absolute h-[76px] w-[76px] rounded-full bg-[#1a1a1a]" />

          {/* Center */}

          <div className="absolute text-center">

            <h3 className="text-[15px] font-bold text-white">
              {formattedTotal}
            </h3>

            <p className="mt-0.5 text-[10px] text-zinc-500">
              {t("common", "total")}
            </p>

          </div>

        </div>

      </div>

      {/* Assets */}

      <div className="mt-5 space-y-2.5">

        {/* USDC */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="h-2.5 w-2.5 rounded-full bg-[#efe5d2]" />

            <span className="text-[13px] text-zinc-300">
              USDC
            </span>

          </div>

          <span className="text-[13px] font-medium text-white">
            {usdcPercent}%
          </span>

        </div>

        {/* EURC */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="h-2.5 w-2.5 rounded-full bg-white" />

            <span className="text-[13px] text-zinc-300">
              EURC
            </span>

          </div>

          <span className="text-[13px] font-medium text-white">
            {eurcPercent}%
          </span>

        </div>

      </div>

    </div>
  );
}