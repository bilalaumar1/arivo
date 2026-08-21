"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function ArcCard() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[28px] border border-[#2b2b2b] bg-[#1a1a1a] p-7">

      <div>

        <p className="text-[15px] text-zinc-500">
          Built on
        </p>

        <div className="mt-5 flex items-center gap-4">

          <Image
            src="/arc-logo.svg"
            alt="Arc"
            width={50}
            height={50}
            className="object-contain"
          />

          <div>

            <p className="text-[16px] font-medium leading-none text-white">
              Arc
            </p>

            <h2 className="mt-1 text-[30px] font-bold leading-none tracking-tight text-white">
              Testnet
            </h2>

          </div>

        </div>

      </div>

      <button className="flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white">

        View on Arc Explorer

        <ArrowUpRight size={15} />

      </button>

    </div>
  );
}