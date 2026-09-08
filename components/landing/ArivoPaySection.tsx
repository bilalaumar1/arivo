import {
  BarChart3,
  CreditCard,
  QrCode,
  ArrowRight,
  ReceiptText,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Payments",
    description: "Accept payments with a simple QR code.",
  },
  {
    icon: BarChart3,
    title: "Merchant Dashboard",
    description: "Track your transactions in one place.",
  },
  {
    icon: CreditCard,
    title: "USDC Payments",
    description: "Simple stablecoin payments for customers.",
  },
  {
    icon: ReceiptText,
    title: "Orders & Payments",
    description: "Manage your customer payments and orders in one place.",
  },
];

export default function ArivoPaySection() {
  return (
    <section
      id="business"
      className="border-b border-black/[0.08] bg-[#EFE9DE]"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777168]">
              Arivo Pay
            </p>

            <h2 className="mt-5 max-w-[500px] text-[42px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[56px]">
              Built for
              <br />
              everyday businesses.
            </h2>

            <p className="mt-6 max-w-[460px] text-[16px] leading-7 text-[#777168]">
              Accept USDC payments and manage your business from a simple
              merchant experience.
            </p>

            <a
              href="/merchant"
              className="mt-8 inline-flex h-13 items-center gap-3 rounded-full bg-[#111111] px-7 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
            >
              Explore Arivo Pay
              <ArrowRight size={17} />
            </a>
          </div>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="border-t border-black/10 pt-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-[#F7F3EA]">
                    <Icon size={18} strokeWidth={1.7} />
                  </div>

                  <h3 className="mt-5 text-[17px] font-semibold text-[#111111]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 max-w-[250px] text-[14px] leading-6 text-[#777168]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}