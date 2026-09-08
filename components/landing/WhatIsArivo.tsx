import { ArrowDownLeft, ArrowUpRight, BarChart3, CreditCard } from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Hold & Manage USDC",
    description: "Keep your money in one simple place.",
  },
  {
    icon: ArrowUpRight,
    title: "Send & Receive",
    description: "Move USDC quickly and easily.",
  },
  {
    icon: BarChart3,
    title: "Earn",
    description: "Put your stablecoins to work.",
  },
  {
    icon: ArrowDownLeft,
    title: "Pay & Get Paid",
    description: "Pay businesses and receive USDC.",
  },
];

export default function WhatIsArivo() {
  return (
    <section
      id="what-is-arivo"
      className="border-b border-black/[0.08] bg-[#F7F3EA]"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777168]">
              What is Arivo
            </p>

            <h2 className="mt-5 max-w-[620px] text-[42px] font-bold leading-[1.02] tracking-[-0.045em] text-[#111111] sm:text-[56px]">
              Your money.
              <br />
              One simple place.
            </h2>
          </div>

          <div className="flex items-end">
            <p className="max-w-[580px] text-[17px] leading-8 text-[#5D5850]">
              Arivo is a modern stablecoin wallet built on Arc. Send and
              receive USDC, manage your balance, earn on your assets, and pay
              businesses from one simple interface.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="min-h-[190px] rounded-[22px] border border-black/[0.10] bg-white/35 p-6 transition hover:bg-white/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.10] bg-[#F7F3EA] text-[#111111]">
                  <Icon size={19} strokeWidth={1.7} />
                </div>

                <h3 className="mt-8 text-[17px] font-semibold tracking-[-0.02em] text-[#111111]">
                  {feature.title}
                </h3>

                <p className="mt-2 max-w-[210px] text-[14px] leading-6 text-[#777168]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}