"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { getProfile } from "@/lib/profile";

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
    <div className="w-full max-w-[460px] rounded-[32px] border border-[#2b2b2b] bg-[#181818] p-9 shadow-2xl">

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
        Continue with your wallet or Google account to access your USDC wallet,
        payments and merchant dashboard.
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

      {/* Footer */}
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
  );
}