"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  getAddressTransactions,
  Transaction,
} from "@/lib/explorer";

export default function Transactions() {
  const { user } = usePrivy();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadTransactions = useCallback(
    async (showLoading = false) => {
      if (!user?.wallet?.address) {
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const txs = await getAddressTransactions(
          user.wallet.address
        );

        setTransactions(txs);
      } catch (error) {
        console.error(
          "Failed to load transactions:",
          error
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    loadTransactions(true);
  }, [loadTransactions]);

  useEffect(() => {
    const refresh = () => {
      loadTransactions(false);
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
    if (!user?.wallet?.address) return;

    const interval = setInterval(() => {
      loadTransactions(false);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user, loadTransactions]);

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-[#2b2b2b] bg-[#1a1a1a] p-5">

      {/* Header */}
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">

        <h2 className="text-[17px] font-semibold text-white">
          Recent Transactions
        </h2>

        <button
          type="button"
          className="text-[13px] font-medium text-[#efe5d2] transition hover:text-white"
        >
          View all
        </button>

      </div>

      {/* Transaction list */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent">

        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No transactions found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">

            {transactions.map((tx) => {

              const address = tx.sent
                ? tx.to
                : tx.from;

              return (
                <div
                  key={tx.hash}
                  className="flex h-[70px] flex-shrink-0 items-center justify-between rounded-xl border border-white/5 bg-[#202020] px-4"
                >

                  {/* LEFT */}
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
                          ? `Sent ${tx.symbol}`
                          : `Received ${tx.symbol}`}
                      </h3>

                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {address.slice(0, 8)}...
                        {address.slice(-6)}
                      </p>

                    </div>

                  </div>


                  {/* RIGHT */}
                  <div className="flex-shrink-0 text-right">

                    <p
                      className={`text-[14px] font-semibold ${
                        tx.sent
                          ? "text-white"
                          : "text-[#22c55e]"
                      }`}
                    >
                      {tx.sent ? "-" : "+"}
                      {tx.amount.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}{" "}
                      {tx.symbol}
                    </p>

                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {new Date(
                        tx.timestamp
                      ).toLocaleString()}
                    </p>

                    <p className="mt-0.5 text-[11px] text-[#22c55e]">
                      Confirmed
                    </p>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
}