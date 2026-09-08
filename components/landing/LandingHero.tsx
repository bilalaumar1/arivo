"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="border-b border-black/[0.08]">
      <div className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-[1440px] items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-6 lg:px-12 lg:py-16">
        {/* LEFT */}
        <div className="max-w-[650px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/40 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#222222]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
            Built on Arc
          </div>

          <h1 className="max-w-[680px] text-[48px] font-bold leading-[0.98] tracking-[-0.055em] text-[#111111] sm:text-[64px] lg:text-[76px]">
            Move USDC
            <br />
            like it&apos;s simple.
          </h1>

          <p className="mt-7 max-w-[570px] text-[16px] leading-7 text-[#55514A] sm:text-[18px] sm:leading-8">
            A modern stablecoin wallet for everyday people and businesses.
            Send, receive, manage and spend USDC with a seamless experience
            built on Arc.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-13 items-center justify-center gap-3 rounded-full bg-[#111111] px-7 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
            >
              Get started
              <ArrowRight size={17} strokeWidth={2} />
            </Link>

            <a
              href="#what-is-arivo"
              className="inline-flex h-13 items-center justify-center rounded-full border border-black/15 bg-white/35 px-7 text-[15px] font-semibold text-[#111111] transition hover:bg-white/60"
            >
              Learn more
            </a>
          </div>
        </div>

        {/* RIGHT — ARIVO MOBILE PRODUCT PREVIEW */}
        <div className="relative flex min-h-[500px] items-center justify-center sm:min-h-[600px] lg:min-h-[650px]">
          <div className="absolute inset-8 rounded-[40px] bg-[#ECE6DA] blur-3xl" />

          <div className="relative flex h-[520px] w-[360px] items-center justify-center overflow-hidden rounded-[32px] border border-black/10 bg-[#EDE7DC] shadow-[0_30px_80px_rgba(17,17,17,0.12)] sm:h-[610px] sm:w-[430px] sm:rounded-[36px] lg:h-[650px] lg:w-[460px]">
            <Image
              src="/mobile overview.png"
              alt="Arivo mobile app"
              width={941}
              height={1672}
              className="h-full w-full scale-[1.08] object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}