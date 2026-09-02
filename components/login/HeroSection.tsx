"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default function HeroSection() {
  return (
    <div className="flex h-full flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-16 lg:py-16">

      {/* Badge */}
      <span className="w-fit rounded-full border border-[#2b2b2b] bg-[#181818] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#EDE2CF] sm:px-4 sm:text-xs sm:tracking-[0.25em]">
        Built on Arc Testnet
      </span>

      {/* Title */}
      <h1 className="mt-6 text-[40px] font-bold leading-[1.05] text-white sm:mt-8 sm:text-[48px] lg:text-[56px]">
        Move USDC
        <br />
        without borders.
      </h1>

      {/* Description */}
      <p className="mt-5 max-w-[560px] text-base leading-7 text-zinc-400 sm:mt-6 sm:text-lg sm:leading-8">
        Fast stablecoin payments for merchants, freelancers and everyday
        users. Send, receive and manage USDC with a modern experience built
        on Arc.
      </p>

      {/* Dashboard Preview */}
      <div className="mt-8 overflow-hidden rounded-[22px] border border-[#2b2b2b] bg-[#181818] shadow-2xl sm:mt-10 sm:rounded-[28px] lg:mt-12">
        <Image
          src="/dashboard-preview.png"
          alt="Arivo Dashboard"
          width={1200}
          height={800}
          className="h-auto w-full object-cover"
          priority
        />
      </div>

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2 size={18} className="shrink-0 text-[#EDE2CF]" />
          Instant Payments
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2 size={18} className="shrink-0 text-[#EDE2CF]" />
          Merchant Dashboard
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2 size={18} className="shrink-0 text-[#EDE2CF]" />
          QR Payments
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2 size={18} className="shrink-0 text-[#EDE2CF]" />
          Built on Arc
        </div>
      </div>

    </div>
  );
}