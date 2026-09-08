"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

export default function ArcCard() {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col justify-start rounded-[28px] border border-[#2b2b2b] bg-[#1a1a1a] p-7 lg:justify-between">
      <div>
        <p className="text-[15px] text-zinc-500">
          {t("common", "builtOn")}
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
              {t("common", "testnet")}
            </h2>
          </div>
        </div>
      </div>

      <a
        href="https://arc.network"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white lg:mt-0"
      >
        {t("common", "exploreArc")}
        <ArrowUpRight size={15} />
      </a>
    </div>
  );
}