"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import {
  getAddressTransactions,
  Transaction,
} from "@/lib/explorer";

import { useI18n } from "@/lib/i18n/useI18n";

const RECENT_LIMIT = 5;

function formatAddress(address: string) {
  if (!address) return "—";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatAmount(
  amount: number,
  sent: boolean,
  symbol: string
) {
  const value = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sent ? "-" : "+"}${value} ${symbol}`;
}

function formatDate(
  timestamp: string | number | Date
) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export default function Transactions() {
  const { user } = usePrivy();
  const { t } = useI18n();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);

  const walletAddress =
    user?.wallet?.address ?? "";

  const loadTransactions = useCallback(
    async (showLoading = false) => {
      if (!walletAddress) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const txs =
          await getAddressTransactions(
            walletAddress
          );

        setTransactions(
          Array.isArray(txs) ? txs : []
        );
      } catch (error) {
        console.error(
          "Failed to load transactions:",
          error
        );

        if (showLoading) {
          setTransactions([]);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    void loadTransactions(true);
  }, [loadTransactions]);

  useEffect(() => {
    const refresh = () => {
      void loadTransactions(false);
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
  }, [loadTransactions]);

  useEffect(() => {
    if (!walletAddress) return;

    const interval = window.setInterval(() => {
      void loadTransactions(false);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [walletAddress, loadTransactions]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, RECENT_LIMIT),
    [transactions]
  );

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[24px] border border-[#2b2b2b] bg-[#1a1a1a] p-5">

      {/* Header */}

      <div className="mb-4 flex flex-shrink-0 items-center justify-between">

        <div>
          <h2 className="text-[17px] font-semibold text-white">
            {t("common", "recentTransactions")}
          </h2>

          <p className="mt-1 text-[11px] text-zinc-600">
            {t("common", "latestArcActivity")}
          </p>
        </div>

        <Link
          href="/transactions"
          className="text-[13px] font-medium text-[#efe5d2] transition hover:text-white"
        >
          {t("common", "viewAll")}
        </Link>

      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#3a3a3a]">

        {loading ? (

          <div className="space-y-3">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex h-[70px] animate-pulse items-center justify-between rounded-xl border border-white/5 bg-[#202020] px-4"
              >

                <div className="flex items-center gap-3">

                  <div className="h-9 w-9 rounded-[10px] bg-[#2a2a2a]" />

                  <div>
                    <div className="h-3 w-24 rounded bg-[#2a2a2a]" />

                    <div className="mt-2 h-2.5 w-32 rounded bg-[#252525]" />
                  </div>

                </div>

                <div className="text-right">

                  <div className="ml-auto h-3 w-20 rounded bg-[#2a2a2a]" />

                  <div className="mt-2 ml-auto h-2.5 w-24 rounded bg-[#252525]" />

                </div>

              </div>
            ))}

          </div>

        ) : recentTransactions.length === 0 ? (

          <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm text-zinc-500">

            <div>

              <p>
                {t("common", "noTransactionsFound")}
              </p>

              <p className="mt-1 text-[11px] text-zinc-700">
                {t("common", "latestArcActivityAppear")}
              </p>

            </div>

          </div>

        ) : (

          <div className="flex flex-col gap-3">

            {recentTransactions.map(
              (tx, index) => {
                const address = tx.sent
                  ? tx.to
                  : tx.from;

                return (
                  <div
                    key={`${tx.hash}-${index}`}
                    className="flex min-h-[70px] flex-shrink-0 items-center justify-between rounded-xl border border-white/5 bg-[#202020] px-4"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${
                          tx.sent
                            ? "bg-[#f3efe7]"
                            : "bg-[#a8d75d]"
                        }`}
                      >

                        <span className="text-[13px] font-bold text-black">
                          {tx.sent ? "↑" : "↓"}
                        </span>

                      </div>

                      <div className="min-w-0">

                        <h3 className="truncate text-[14px] font-medium text-white">
                          {tx.sent
                            ? t(
                                "common",
                                "sent"
                              ) +
                              ` ${tx.symbol}`
                            : t(
                                "common",
                                "received"
                              ) +
                              ` ${tx.symbol}`}
                        </h3>

                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {formatAddress(address)}
                        </p>

                      </div>

                    </div>

                    <div className="ml-4 flex-shrink-0 text-right">

                      <p
                        className={`text-[14px] font-semibold ${
                          tx.sent
                            ? "text-white"
                            : "text-[#22c55e]"
                        }`}
                      >
                        {formatAmount(
                          tx.amount,
                          tx.sent,
                          tx.symbol
                        )}
                      </p>

                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {formatDate(
                          tx.timestamp
                        )}
                      </p>

                      <p className="mt-0.5 text-[11px] text-[#22c55e]">
                        {t(
                          "common",
                          "confirmed"
                        )}
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </section>
  );
}