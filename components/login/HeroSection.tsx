import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default function HeroSection() {
  return (
    <div className="flex h-full flex-col justify-center px-16 py-16">

      {/* Badge */}
      <span className="w-fit rounded-full border border-[#2b2b2b] bg-[#181818] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#EDE2CF]">
        Built on Arc Testnet
      </span>

      {/* Title */}
      <h1 className="mt-8 text-[56px] font-bold leading-[1.05] text-white">
        Move USDC
        <br />
        without borders.
      </h1>

      {/* Description */}
      <p className="mt-6 max-w-[560px] text-lg leading-8 text-zinc-400">
        Fast stablecoin payments for merchants, freelancers and everyday
        users. Send, receive and manage USDC with a modern experience built
        on Arc.
      </p>

      {/* Dashboard Preview */}
      <div className="mt-12 overflow-hidden rounded-[28px] border border-[#2b2b2b] bg-[#181818] shadow-2xl">

        <Image
          src="/dashboard-preview.png"
          alt="Arivo Dashboard"
          width={1200}
          height={800}
          className="w-full object-cover"
          priority
        />

      </div>

      {/* Features */}
      <div className="mt-10 grid grid-cols-2 gap-6">

        <div className="flex items-center gap-3 text-white">
          <CheckCircle2 size={18} className="text-[#EDE2CF]" />
          Instant Payments
        </div>

        <div className="flex items-center gap-3 text-white">
          <CheckCircle2 size={18} className="text-[#EDE2CF]" />
          Merchant Dashboard
        </div>

        <div className="flex items-center gap-3 text-white">
          <CheckCircle2 size={18} className="text-[#EDE2CF]" />
          QR Payments
        </div>

        <div className="flex items-center gap-3 text-white">
          <CheckCircle2 size={18} className="text-[#EDE2CF]" />
          Built on Arc
        </div>

      </div>

    </div>
  );
}