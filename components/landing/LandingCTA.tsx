import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingCTA() {
  return (
    <section className="bg-[#111111] text-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:flex-row lg:items-end lg:px-12 lg:py-28">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B9B2A6]">
            Start with Arivo
          </p>

          <h2 className="mt-5 max-w-[700px] text-[44px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[60px]">
            Your money.
            <br />
            Without the complexity.
          </h2>
        </div>

        <Link
          href="/login"
          className="inline-flex h-[52px] shrink-0 items-center gap-3 rounded-full bg-[#F7F3EA] px-7 text-[15px] font-semibold text-[#111111] transition hover:bg-white"
        >
          Get started
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}