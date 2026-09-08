import { ArrowRight, Plus, UserRound } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Create your account",
    description: "Sign up with your wallet or Google account.",
  },
  {
    number: "02",
    icon: Plus,
    title: "Fund your wallet",
    description: "Add USDC and manage your balance.",
  },
  {
    number: "03",
    icon: ArrowRight,
    title: "Move your money",
    description: "Send, receive, earn or pay businesses.",
  },
];

export default function HowArivoWorks() {
  return (
    <section className="border-b border-black/[0.08] bg-[#F7F3EA]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777168]">
              How Arivo works
            </p>

            <h2 className="mt-5 max-w-[450px] text-[42px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[56px]">
              Get started
              <br />
              in minutes.
            </h2>

            <p className="mt-6 max-w-[380px] text-[16px] leading-7 text-[#777168]">
              A simple way to start moving your money with Arivo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-[22px] border border-black/[0.10] bg-white/35 p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[28px] font-medium tracking-[-0.04em] text-[#777168]">
                      {step.number}
                    </span>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
                      <Icon size={18} strokeWidth={1.7} />
                    </div>
                  </div>

                  <h3 className="mt-12 text-[17px] font-semibold text-[#111111]">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-[14px] leading-6 text-[#777168]">
                    {step.description}
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