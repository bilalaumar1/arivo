"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { getProfile } from "@/lib/profile";
import { Mail } from "lucide-react";

export default function LoginCard() {
  const router = useRouter();

  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();

  useEffect(() => {
    async function checkProfile() {
      if (!ready || !authenticated || !user?.wallet?.address) return;

      const profile = await getProfile(user.wallet.address);

      console.log("Wallet:", user.wallet.address);
      console.log("Profile:", profile);

      if (profile) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }

    checkProfile();
  }, [ready, authenticated, user, router]);

  return (
    <div className="flex w-full max-w-[460px] flex-col">
      {/* Login Card */}
      <div className="w-full rounded-[32px] border border-[#2b2b2b] bg-[#181818] p-9 shadow-2xl">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <Image
            src="/arivo-icon.png"
            alt="Arivo"
            width={42}
            height={42}
            className="h-[42px] w-auto"
          />

          <h1 className="text-[28px] font-bold text-white">
            Arivo
          </h1>
        </div>

        {/* Welcome */}
        <p className="text-[15px] font-medium text-[#E6DDCD]">
          Welcome back
        </p>

        <h2 className="mt-2 text-[32px] font-bold leading-tight text-white">
          Sign in to your
          <br />
          Arivo account
        </h2>

        <p className="mt-5 text-[15px] leading-7 text-zinc-400">
          Continue with your wallet or Google account to access your USDC
          wallet, payments and merchant dashboard.
        </p>

        {/* Wallet */}
        <button
          onClick={() =>
            login({
              loginMethods: ["wallet"],
            })
          }
          className="mt-10 flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--arivo-primary)] text-[16px] font-semibold text-black transition hover:opacity-95"
        >
          Continue with Wallet
        </button>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#2b2b2b]" />

          <span className="text-sm uppercase tracking-[0.25em] text-zinc-500">
            OR
          </span>

          <div className="h-px flex-1 bg-[#2b2b2b]" />
        </div>

        {/* Google */}
        <button
          onClick={() =>
            login({
              loginMethods: ["google"],
            })
          }
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#2b2b2b] bg-transparent text-[16px] font-medium text-white transition hover:bg-[#202020]"
        >
          <Image
            src="/google.svg"
            alt="Google"
            width={22}
            height={22}
          />

          Continue with Google
        </button>

        {/* Terms */}
        <p className="mt-8 text-center text-[13px] leading-6 text-zinc-500">
          By continuing you agree to our{" "}
          <span className="cursor-pointer text-white hover:text-[var(--arivo-primary)]">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="cursor-pointer text-white hover:text-[var(--arivo-primary)]">
            Privacy Policy
          </span>
        </p>
      </div>

      {/* Footer — Desktop only */}
      <div className="mt-28 hidden w-full border-t border-[#2b2b2b] pt-8 lg:block">
        <div className="flex w-full items-center justify-between px-1">
          {/* Contact Support */}
          <a
            href="mailto:support@arivopay.xyz"
            className="group flex items-center gap-4 text-[18px] font-medium text-zinc-300 transition hover:text-white"
          >
            <Mail
              size={25}
              strokeWidth={1.8}
              className="shrink-0 transition group-hover:text-white"
            />

            <span>Contact support</span>
          </a>

          {/* X */}
          <a
            href="https://x.com/tryarivo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Arivo on X"
            className="flex h-12 w-12 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-[#1d1d1d] hover:text-white"
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
      </div>
    </div>
  );
}