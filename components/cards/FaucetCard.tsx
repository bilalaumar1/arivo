"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

const FALLBACK_RATE = 0.862;

export default function FaucetCard() {
  const { t } = useI18n();

  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRate = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,euro-coin&vs_currencies=usd",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch exchange rate");
        }

        const data = await response.json();

        const usdcUsd = Number(data?.["usd-coin"]?.usd);
        const eurcUsd = Number(data?.["euro-coin"]?.usd);

        if (
          Number.isFinite(usdcUsd) &&
          Number.isFinite(eurcUsd) &&
          eurcUsd > 0
        ) {
          const liveRate = usdcUsd / eurcUsd;

          if (mounted) {
            setRate(liveRate);
          }
        }
      } catch (error) {
        console.error("Exchange rate error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRate();

    // Update every 30 seconds
    const interval = setInterval(fetchRate, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const formattedRate = rate.toFixed(3);

  return (
    <div className="h-full min-h-[180px] overflow-hidden rounded-[28px] border border-[#2b2b2b] bg-[#1a1a1a] p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold leading-tight text-white">
            {t("common", "exchangeRates")}
          </h3>

          <p className="mt-0 text-sm text-zinc-500">
            {t("common", "liveRate")}
          </p>
        </div>

        {/* Flags */}
        <div className="flex shrink-0 items-center -space-x-2">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#1a1a1a] bg-[#202020] shadow-lg">
            <img
              src="/flags/us.png"
              alt="US"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#1a1a1a] bg-[#202020] shadow-lg">
            <img
              src="/flags/eu.png"
              alt="EU"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Rate */}
      <div className="mt-1 rounded-[22px] border border-[#303030] bg-[#181818] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-400">
            {t("common", "usdEur")}
          </span>

          <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-green-400">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            {t("common", "liveRate")}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="whitespace-nowrap text-[20px] font-semibold leading-none tracking-tight text-white">
            1 USD ={" "}
            {loading ? (
              <span className="text-zinc-500">...</span>
            ) : (
              `${formattedRate} EUR`
            )}
          </div>

          {/* Live rate badge */}
          <div className="flex shrink-0 translate-x-2 items-center gap-1 rounded-[14px] border border-[#303030] bg-[#1b1b1b] px-1 py-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 17L9 11L13 15L21 7"
                stroke="#F3E8D0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 7H21V12"
                stroke="#F3E8D0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span className="text-xs font-medium text-[#F3E8D0]">
              {t("common", "liveRate")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}