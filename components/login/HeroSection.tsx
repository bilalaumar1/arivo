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
          <CheckCircle2
            size={18}
            className="shrink-0 text-[#EDE2CF]"
          />
          Instant Payments
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2
            size={18}
            className="shrink-0 text-[#EDE2CF]"
          />
          Merchant Dashboard
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2
            size={18}
            className="shrink-0 text-[#EDE2CF]"
          />
          QR Payments
        </div>

        <div className="flex items-center gap-3 text-sm text-white sm:text-base">
          <CheckCircle2
            size={18}
            className="shrink-0 text-[#EDE2CF]"
          />
          Built on Arc
        </div>
      </div>

      {/* Support / Social — Mobile only */}
      <div className="mt-10 border-t border-[#2b2b2b] pt-6 lg:hidden">
        <div className="flex w-full items-center justify-between px-1">
          {/* Contact Support */}
          <a
            href="mailto:support@arivopay.xyz"
            className="group flex items-center gap-3 text-[16px] font-medium text-zinc-300 transition hover:text-white sm:text-[17px]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>

            <span>Contact support</span>
          </a>

          {/* X */}
          <a
            href="https://x.com/tryarivo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Arivo on X"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-[#1d1d1d] hover:text-white"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231-5.963 6.817ZM17.083 19.77h1.833L7.084 4.126H5.117L17.083 19.77Z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}