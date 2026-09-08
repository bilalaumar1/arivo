import Image from "next/image";
import Link from "next/link";

const productLinks = [
  ["Wallet", "#what-is-arivo"],
  ["Earn", "#what-is-arivo"],
  ["Payments", "#business"],
  ["Arivo Pay", "/merchant"],
];

const companyLinks = [
  ["About", "#what-is-arivo"],
  ["Built on Arc", "#what-is-arivo"],
  ["Community", "#resources"],
];

const resourceLinks = [
  ["FAQ", "#resources"],
  ["Support", "mailto:support@arivopay.xyz"],
];

export default function LandingFooter() {
  return (
    <footer id="support" className="bg-[#F7F3EA] text-[#111111]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/arivo-icon-black.png"
                alt="Arivo"
                width={34}
                height={34}
                className="h-[34px] w-auto object-contain"
              />

              <span className="text-[22px] font-bold tracking-[-0.04em]">
                Arivo
              </span>
            </Link>

            <p className="mt-5 max-w-[270px] text-[14px] leading-6 text-[#777168]">
              Stablecoin payments for a more connected economy.
            </p>

            {/* X / Twitter */}
            <a
              href="https://x.com/tryarivo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Arivo on X"
              className="mt-6 inline-flex items-center justify-center text-[#111111] transition hover:opacity-60"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
              </svg>
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Product
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              {productLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="w-fit text-[14px] text-[#777168] transition hover:text-[#111111]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Company
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              {companyLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="w-fit text-[14px] text-[#777168] transition hover:text-[#111111]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Resources
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              {resourceLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="w-fit text-[14px] text-[#777168] transition hover:text-[#111111]"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-14 flex flex-col gap-4 border-t border-black/10 pt-6 text-[12px] text-[#777168] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Arivo. All rights reserved.</span>

          <div className="flex gap-6">
            <a href="#" className="hover:text-[#111111]">
              Terms of Service
            </a>

            <a href="#" className="hover:text-[#111111]">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}