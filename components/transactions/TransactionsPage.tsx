"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  getAddressTransactions,
  Transaction as ExplorerTransaction,
} from "@/lib/explorer";

import Sidebar from "@/components/layout/Sidebar";

import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  ReceiptText,
  Wallet,
  X,
  Clock3,
} from "lucide-react";

type TransactionType = "sent" | "received";
type TransactionStatus = "confirmed" | "pending" | "failed";
type Tab = "all" | "sent" | "received";

type DisplayTransaction = {
  id: string;
  type: TransactionType;
  asset: "USDC" | "EURC";
  amount: number;
  address: string;
  date: string;
  status: TransactionStatus;
  hash: string;
};

const tabs: { label: string; value: Tab }[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Sent",
    value: "sent",
  },
  {
    label: "Received",
    value: "received",
  },
];


function statusIcon(status: TransactionStatus) {
  if (status === "confirmed") {
    return (
      <CheckCircle2
        size={15}
        className="text-green-500"
      />
    );
  }

  if (status === "pending") {
    return (
      <Clock3
        size={15}
        className="text-yellow-500"
      />
    );
  }

  return (
    <X
      size={15}
      className="text-red-500"
    />
  );
}

function statusText(status: TransactionStatus) {
  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "pending") {
    return "Pending";
  }

  return "Failed";
}

function formatAmount(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortenAddress(address: string) {
  if (!address) {
    return "Unknown";
  }

  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function formatDate(timestamp: string | number) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
}

export default function TransactionsPage() {
  const { user } = usePrivy();

  const [transactions, setTransactions] = useState<
    DisplayTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState<Tab>("all");

  const [showFilterMenu, setShowFilterMenu] =
    useState(false);

  const [selectedTransaction, setSelectedTransaction] =
    useState<DisplayTransaction | null>(null);

  const [copied, setCopied] = useState(false);

  const walletAddress = user?.wallet?.address;

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
          await getAddressTransactions(walletAddress);

        const mappedTransactions: DisplayTransaction[] =
          txs.map(
            (
              tx: ExplorerTransaction,
              index: number
            ) => {
              const isSent = Boolean(tx.sent);

              const address = isSent
                ? tx.to
                : tx.from;

              return {
                id: `${tx.hash}-${index}`,
                type: isSent
                  ? "sent"
                  : "received",
                asset:
                  tx.symbol === "EURC"
                    ? "EURC"
                    : "USDC",
                amount: Number(tx.amount) || 0,
                address: address || "",
                date: formatDate(
                  tx.timestamp
                ),
                status: "confirmed",
                hash: tx.hash,
              };
            }
          );

        setTransactions(mappedTransactions);
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
    [walletAddress]
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
    if (!walletAddress) {
      return;
    }

    const interval = window.setInterval(() => {
      loadTransactions(false);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [walletAddress, loadTransactions]);

  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") {
      return transactions;
    }

    return transactions.filter(
      (tx) => tx.type === activeTab
    );
  }, [transactions, activeTab]);

  const sentCount = useMemo(() => {
    return transactions.filter(
      (tx) => tx.type === "sent"
    ).length;
  }, [transactions]);

  const receivedCount = useMemo(() => {
    return transactions.filter(
      (tx) => tx.type === "received"
    ).length;
  }, [transactions]);

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  }

  function openExplorer(hash: string) {
    window.open(
      `https://testnet.arcscan.app/tx/${hash}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1">

        {/* HEADER */}

        <header className="flex min-h-[88px] items-center justify-between border-b border-[#292929] px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
              aria-label="Go back"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-[26px] font-semibold">
                Transactions
              </h1>

              <p className="mt-1 text-[13px] text-zinc-500">
                View and manage your transaction history on Arc Testnet.
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowFilterMenu((current) => !current)
              }
              aria-expanded={showFilterMenu}
              aria-haspopup="menu"
              className="flex h-10 items-center gap-2 rounded-xl border border-[#333] bg-[#1c1c1c] px-4 text-[13px] text-zinc-300 transition hover:bg-[#242424]"
            >
              <Filter size={16} />
              Filter
            </button>

            {showFilterMenu && (
              <div
                role="menu"
                className="absolute right-0 top-12 z-50 min-w-[150px] overflow-hidden rounded-2xl border border-[#303030] bg-[#1b1b1b] p-1.5 shadow-2xl"
              >
                {tabs.map((tab) => {
                  const active =
                    activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setShowFilterMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] transition ${
                        active
                          ? "bg-[#efe5d2] font-semibold text-black"
                          : "text-zinc-400 hover:bg-[#242424] hover:text-white"
                      }`}
                    >
                      {tab.label}

                      {active && (
                        <Check size={14} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}

        <main className="p-6 sm:p-8">
          <div className="mx-auto max-w-[1200px]">
            {/* SUMMARY */}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[20px] border border-[#2d2d2d] bg-[#191919] p-5">
                <p className="text-[12px] text-zinc-500">
                  Total transactions
                </p>

                <p className="mt-2 text-[26px] font-semibold">
                  {transactions.length}
                </p>

                <p className="mt-1 text-[12px] text-zinc-600">
                  Across Arc Testnet
                </p>
              </div>

              <div className="rounded-[20px] border border-[#2d2d2d] bg-[#191919] p-5">
                <p className="text-[12px] text-zinc-500">
                  Sent
                </p>

                <p className="mt-2 text-[26px] font-semibold">
                  {sentCount}
                </p>

                <p className="mt-1 text-[12px] text-zinc-600">
                  Outgoing transactions
                </p>
              </div>

              <div className="rounded-[20px] border border-[#2d2d2d] bg-[#191919] p-5">
                <p className="text-[12px] text-zinc-500">
                  Received
                </p>

                <p className="mt-2 text-[26px] font-semibold">
                  {receivedCount}
                </p>

                <p className="mt-1 text-[12px] text-zinc-600">
                  Incoming transactions
                </p>
              </div>
            </div>

            {/* TRANSACTION HISTORY */}

            <section className="overflow-hidden rounded-[24px] border border-[#2d2d2d] bg-[#191919]">
              <div className="flex flex-col gap-4 border-b border-[#292929] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold">
                    Transaction history
                  </h2>

                  <p className="mt-1 text-[12px] text-zinc-500">
                    Your latest activity on Arc Testnet.
                  </p>
                </div>

                <div className="flex w-fit rounded-xl border border-[#303030] bg-[#141414] p-1">
                  {tabs.map((tab) => {
                    const active =
                      activeTab === tab.value;

                    return (
                      <button
                        type="button"
                        key={tab.value}
                        onClick={() =>
                          setActiveTab(tab.value)
                        }
                        className={`rounded-lg px-4 py-2 text-[12px] font-medium transition ${
                          active
                            ? "bg-[#efe5d2] text-black"
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LOADING */}

              {loading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <p className="text-[13px] text-zinc-500">
                    Loading transactions...
                  </p>
                </div>
              ) : (
                <>
                  {/* LIST */}

                  <div className="divide-y divide-[#292929]">
                    {filteredTransactions.map(
                      (transaction) => {
                        const isSent =
                          transaction.type ===
                          "sent";

                        return (
                          <button
                            type="button"
                            key={transaction.id}
                            onClick={() =>
                              setSelectedTransaction(
                                transaction
                              )
                            }
                            className="group flex w-full items-center gap-3 px-4 py-5 text-left transition hover:bg-[#202020] sm:gap-4 sm:px-6"
                          >
                            {/* ICON */}

                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                isSent
                                  ? "bg-[#242424] text-white"
                                  : "bg-[#a9df55] text-black"
                              }`}
                            >
                              {isSent ? (
                                <ArrowUpRight
                                  size={21}
                                />
                              ) : (
                                <ArrowDownLeft
                                  size={21}
                                />
                              )}
                            </div>

                            {/* INFO */}

                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold">
                                {isSent
                                  ? "Sent"
                                  : "Received"}{" "}
                                {transaction.asset}
                              </p>

                              <p className="mt-1 truncate text-[12px] text-zinc-500">
                                {shortenAddress(
                                  transaction.address
                                )}
                              </p>
                            </div>

                            {/* DATE */}

                            <div className="hidden text-right md:block">
                              <p className="text-[12px] text-zinc-500">
                                {transaction.date}
                              </p>

                              <div className="mt-1 flex items-center justify-end gap-1.5">
                                {statusIcon(
                                  transaction.status
                                )}

                                <span
                                  className={`text-[11px] ${
                                    transaction.status ===
                                    "confirmed"
                                      ? "text-green-500"
                                      : transaction.status ===
                                          "pending"
                                        ? "text-yellow-500"
                                        : "text-red-500"
                                  }`}
                                >
                                  {statusText(
                                    transaction.status
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* AMOUNT */}

                            <div className="min-w-[100px] text-right sm:min-w-[125px]">
                              <p
                                className={`text-[15px] font-semibold ${
                                  isSent
                                    ? "text-white"
                                    : "text-green-500"
                                }`}
                              >
                                {isSent
                                  ? "-"
                                  : "+"}
                                {formatAmount(
                                  transaction.amount
                                )}{" "}
                                {transaction.asset}
                              </p>

                              <ChevronRight
                                size={16}
                                className="ml-auto mt-1 text-zinc-700 transition group-hover:text-zinc-400"
                              />
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* EMPTY */}

                  {filteredTransactions.length ===
                    0 && (
                    <div className="flex min-h-[300px] flex-col items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#222]">
                        <Wallet
                          size={22}
                          className="text-zinc-500"
                        />
                      </div>

                      <p className="mt-4 text-[14px] font-medium">
                        No transactions found
                      </p>

                      <p className="mt-1 text-[12px] text-zinc-600">
                        Your transaction activity will appear here.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* NETWORK */}

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#292929] bg-[#171717] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />

                <div>
                  <p className="text-[12px] font-medium">
                    Arc Testnet
                  </p>

                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    Connected
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-[#222] px-3 py-1.5 text-[10px] text-zinc-500">
                Testnet
              </span>
            </div>
          </div>
        </main>
      </main>

      {/* DETAILS MODAL */}

      {selectedTransaction !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#303030] bg-[#181818] shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#292929] px-6 py-5">
              <div>
                <h2 className="text-[18px] font-semibold">
                  Transaction details
                </h2>

                <p className="mt-1 text-[11px] text-zinc-500">
                  Arc Testnet
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTransaction(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#333] bg-[#202020] text-zinc-400 transition hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-6">
              {/* STATUS */}

              <div className="flex items-center gap-4 rounded-2xl border border-[#2d2d2d] bg-[#202020] p-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    selectedTransaction.type ===
                    "sent"
                      ? "bg-[#292929]"
                      : "bg-[#a9df55] text-black"
                  }`}
                >
                  {selectedTransaction.type ===
                  "sent" ? (
                    <ArrowUpRight
                      size={21}
                    />
                  ) : (
                    <ArrowDownLeft
                      size={21}
                    />
                  )}
                </div>

                <div>
                  <p className="text-[15px] font-semibold">
                    {selectedTransaction.type ===
                    "sent"
                      ? "Sent"
                      : "Received"}{" "}
                    {selectedTransaction.asset}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    {statusIcon(
                      selectedTransaction.status
                    )}

                    <span className="text-[11px] text-green-500">
                      {statusText(
                        selectedTransaction.status
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* AMOUNT */}

              <div className="py-7 text-center">
                <p className="text-[32px] font-semibold">
                  {selectedTransaction.type ===
                  "sent"
                    ? "-"
                    : "+"}
                  {formatAmount(
                    selectedTransaction.amount
                  )}{" "}
                  {selectedTransaction.asset}
                </p>

                <p className="mt-2 text-[12px] text-zinc-500">
                  {selectedTransaction.date}
                </p>
              </div>

              {/* DETAILS */}

              <div className="space-y-4 rounded-2xl border border-[#2d2d2d] bg-[#202020] p-5">
                {/* ASSET */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-zinc-500">
                    Asset
                  </span>

                  <span className="text-[13px] font-medium">
                    {selectedTransaction.asset}
                  </span>
                </div>

                <div className="h-px bg-[#2c2c2c]" />

                {/* ADDRESS */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-zinc-500">
                    Address
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedTransaction.address
                      )
                    }
                    className="flex min-w-0 items-center gap-2 text-zinc-300 transition hover:text-white"
                  >
                    {copied ? (
                      <Check
                        size={15}
                        className="shrink-0 text-green-500"
                      />
                    ) : (
                      <Copy
                        size={15}
                        className="shrink-0"
                      />
                    )}

                    <span className="max-w-[250px] truncate text-[12px]">
                      {selectedTransaction.address}
                    </span>
                  </button>
                </div>

                <div className="h-px bg-[#2c2c2c]" />

                {/* HASH */}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-zinc-500">
                    Transaction hash
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedTransaction.hash
                      )
                    }
                    className="flex min-w-0 items-center gap-2 text-zinc-300 transition hover:text-white"
                  >
                    {copied ? (
                      <Check
                        size={14}
                        className="text-green-500"
                      />
                    ) : (
                      <Copy size={14} />
                    )}

                    <span className="max-w-[200px] truncate text-[12px]">
                      {selectedTransaction.hash}
                    </span>
                  </button>
                </div>
              </div>

              {/* EXPLORER */}

              <button
                type="button"
                onClick={() =>
                  openExplorer(
                    selectedTransaction.hash
                  )
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] py-3.5 text-[13px] font-semibold text-black transition hover:bg-[#e5dac4]"
              >
                View on Arc Explorer
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}