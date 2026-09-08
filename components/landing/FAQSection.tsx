"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What exactly is Arivo?",
    answer:
      "Arivo is a stablecoin wallet built on Arc that lets you manage, send and receive USDC from one simple interface.",
  },
  {
    question: "Do I need to understand crypto to use Arivo?",
    answer:
      "No. Arivo is designed to keep everyday stablecoin payments simple and easy to understand.",
  },
  {
    question: "What is USDC, and why does Arivo use it?",
    answer:
      "USDC is a digital dollar designed to maintain a value close to one US dollar. Arivo uses USDC for its wallet and payment experience.",
  },
  {
    question: "How fast do payments actually settle?",
    answer:
      "Arivo payments are processed on Arc. The exact settlement time depends on the blockchain transaction and network conditions.",
  },
  {
    question: "Is my money safe with Arivo?",
    answer:
      "Arivo gives you control of your connected wallet and provides a simple interface for managing your assets. Always verify transaction details before confirming a payment.",
  },
  {
    question: "Can I get paid from anywhere in the world?",
    answer:
      "Arivo supports receiving USDC through your wallet, subject to the availability and rules of the services you use.",
  },
  {
    question: "What is Earn?",
    answer:
      "Earn lets eligible stablecoins be supplied to the supported lending market through Arivo.",
  },
  {
    question: "What can I use Arivo Pay for?",
    answer:
      "Arivo Pay provides merchant tools for accepting USDC payments, including QR payments and merchant transaction management.",
  },
  {
    question: "Do I need a business to use Arivo?",
    answer:
      "No. Arivo can be used as a personal wallet, while Arivo Pay provides additional tools for businesses.",
  },
  {
    question: "What does it cost to use Arivo?",
    answer:
      "Any transaction or network costs depend on the action you perform and the network conditions at the time.",
  },
  {
    question: "Is Arivo available on mobile?",
    answer:
      "Yes. Arivo's interface is designed to work across desktop and mobile screen sizes.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="resources" className="border-b border-black/[0.08] bg-[#F7F3EA]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#777168]">
              FAQ
            </p>

            <h2 className="mt-5 max-w-[500px] text-[42px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[56px]">
              All your questions
              <br />
              answered.
            </h2>

            <p className="mt-6 max-w-[330px] text-[15px] leading-7 text-[#777168]">
              Everything you need to know about using Arivo.
            </p>
          </div>

          <div>
            {faqs.map((faq, index) => {
              const open = openIndex === index;

              return (
                <div
                  key={faq.question}
                  className="border-b border-black/10 first:border-t"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-[15px] font-medium text-[#222222] sm:text-[16px]">
                      {faq.question}
                    </span>

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10">
                      {open ? (
                        <Minus size={14} strokeWidth={1.7} />
                      ) : (
                        <Plus size={14} strokeWidth={1.7} />
                      )}
                    </span>
                  </button>

                  {open && (
                    <div className="pb-5 pr-12 text-[14px] leading-6 text-[#777168]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}