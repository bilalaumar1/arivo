"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Sidebar from "@/components/layout/Sidebar";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  getArivoOrders,
  type ArivoOrder,
  type ArivoOrderStatus,
} from "@/lib/orderStore";

const statusMeta: Record<
  ArivoOrderStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  payment_pending: {
    label: "Payment pending",
    icon: Clock3,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  payment_confirmed: {
    label: "Payment confirmed",
    icon: Check,
    className: "border-green-500/20 bg-green-500/10 text-green-400",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  },
  fulfilled: {
    label: "Fulfilled",
    icon: PackageCheck,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "border-red-500/20 bg-red-500/10 text-red-400",
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function shorten(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 9)}...${value.slice(-7)}`;
}

export default function OrdersPage() {
  const { user } = usePrivy();
  const [orders, setOrders] = useState<ArivoOrder[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ArivoOrderStatus>("all");
  const [selected, setSelected] = useState<ArivoOrder | null>(null);

  const load = () => {
    const currentWallet = user?.wallet?.address?.toLowerCase();

    if (!currentWallet) {
      setOrders([]);
      return;
    }

    setOrders(
      getArivoOrders().filter(
        (order) =>
          order.ownerWalletAddress?.toLowerCase() === currentWallet
      )
    );
  };

  useEffect(() => {
    load();
    const fn = () => load();
    window.addEventListener("arivo:orders-updated", fn);
    return () => window.removeEventListener("arivo:orders-updated", fn);
  }, [user?.wallet?.address]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const byStatus = filter === "all" || order.status === filter;
      const byQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.serviceName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.transactionHash.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [orders, query, filter]);

  const stats = {
    total: orders.length,
    confirmed: orders.filter((x) => x.status === "payment_confirmed").length,
    processing: orders.filter((x) => x.status === "processing").length,
    fulfilled: orders.filter((x) => x.status === "fulfilled").length,
  };

  function explorer(hash: string) {
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
        <header className="flex min-h-[96px] items-center justify-between border-b border-[#292929] px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[26px] font-semibold">Orders</h1>
              <p className="mt-1 text-[13px] text-zinc-500">
                Track payment confirmation and service fulfillment.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-[#303030] bg-[#191919] px-4 py-2 sm:flex">
            <ShieldCheck size={15} className="text-green-500" />
            <span className="text-[12px] text-zinc-300">Arc Testnet</span>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-[1250px]">
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Total orders", stats.total],
                ["Payment confirmed", stats.confirmed],
                ["Processing", stats.processing],
                ["Fulfilled", stats.fulfilled],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-[22px] border border-[#2d2d2d] bg-[#191919] p-5"
                >
                  <p className="text-[11px] text-zinc-600">{label}</p>
                  <p className="mt-2 text-[28px] font-semibold">{value}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold">Order activity</h2>
                  <p className="mt-1 text-[12px] text-zinc-500">
                    Blockchain payment and provider fulfillment are separate
                    states.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search orders..."
                      className="h-10 w-full rounded-xl border border-[#333] bg-[#202020] pl-9 pr-4 text-[12px] text-white outline-none placeholder:text-zinc-600 focus:border-[#555] sm:w-[250px]"
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as "all" | ArivoOrderStatus)
                    }
                    className="h-10 rounded-xl border border-[#333] bg-[#202020] px-3 text-[12px] text-zinc-300 outline-none"
                  >
                    <option value="all">All statuses</option>
                    <option value="payment_confirmed">
                      Payment confirmed
                    </option>
                    <option value="processing">Processing</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[18px] border border-[#2d2d2d]">
                {filtered.length === 0 ? (
                  <div className="flex min-h-[260px] items-center justify-center px-5 text-center">
                    <div>
                      <p className="text-[14px] font-medium">No orders found</p>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Complete a service payment from Arivo Pay and the order
                        will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  filtered.map((order) => {
                    const meta = statusMeta[order.status];
                    const Icon = meta.icon;

                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelected(order)}
                        className="grid w-full gap-4 border-b border-[#292929] bg-[#171717] p-5 text-left transition last:border-b-0 hover:bg-[#1b1b1b] lg:grid-cols-[1.3fr_1fr_1fr_1fr_24px] lg:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-semibold">
                              {order.serviceName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${meta.className}`}
                            >
                              <Icon size={11} />
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {order.id}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-zinc-600">Amount</p>
                          <p className="mt-1 text-[12px] font-medium">
                            {order.localAmountFormatted}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-zinc-600">Paid</p>
                          <p className="mt-1 text-[12px] font-medium">
                            {order.cryptoAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })}{" "}
                            {order.paymentAsset}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-zinc-600">Created</p>
                          <p className="mt-1 text-[11px] text-zinc-300">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>

                        <ArrowUpRight
                          size={17}
                          className="hidden text-zinc-600 lg:block"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[700px] overflow-hidden rounded-[26px] border border-[#333] bg-[#171717] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2b2b2b] px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  {selected.id}
                </p>
                <h2 className="mt-1 text-[20px] font-semibold">
                  {selected.serviceName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-[#242424] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Status", statusMeta[selected.status].label],
                  ["Service amount", selected.localAmountFormatted],
                  [
                    "Paid",
                    `${selected.cryptoAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })} ${selected.paymentAsset}`,
                  ],
                  ["Network", selected.network],
                  ["Email", selected.email || "Not provided"],
                  ["Created", formatDate(selected.createdAt)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4"
                  >
                    <p className="text-[10px] text-zinc-600">{label}</p>
                    <p className="mt-1 break-words text-[12px] font-medium text-zinc-200">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4">
                <p className="text-[10px] text-zinc-600">Fulfillment</p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-300">
                  {selected.fulfillmentNote}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4">
                <p className="text-[10px] text-zinc-600">Transaction hash</p>
                <p className="mt-1 break-all text-[11px] text-zinc-300">
                  {selected.transactionHash}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(selected.transactionHash)
                    }
                    className="flex h-9 items-center gap-2 rounded-xl border border-[#333] bg-[#202020] px-3 text-[11px] text-zinc-300 hover:text-white"
                  >
                    Copy hash
                  </button>

                  <button
                    type="button"
                    onClick={() => explorer(selected.transactionHash)}
                    className="flex h-9 items-center gap-2 rounded-xl border border-[#333] bg-[#202020] px-3 text-[11px] text-zinc-300 hover:text-white"
                  >
                    <ExternalLink size={14} />
                    Explorer
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#1c1c1c] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#202020]">
                    <ShieldCheck size={17} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium">
                      Payment verified on-chain
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                      Service fulfillment must be confirmed separately by the
                      provider.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#2b2b2b] px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl border border-[#333] bg-[#202020] px-4 text-[12px] text-zinc-300 hover:bg-[#272727] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
