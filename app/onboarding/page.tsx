"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import WelcomeStep from "@/components/onboarding/WelcomeStep";
import ProfileStep from "./ProfileStep";
import AvatarStep from "./AvatarStep";

import {
  getProfile,
  createProfile,
} from "@/lib/profile";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = usePrivy();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function checkProfile() {
      if (!user?.wallet?.address) return;

      const profile = await getProfile(
        user.wallet.address
      );

      if (profile) {
        router.replace("/dashboard");
      }
    }

    checkProfile();
  }, [user, router]);

  async function finishOnboarding() {
  if (!user?.wallet?.address) return;

  try {
    const existing = await getProfile(
      user.wallet.address
    );

    if (!existing) {
      await createProfile(
  user.wallet.address,
  username,
  `https://api.dicebear.com/9.x/personas/png?seed=${encodeURIComponent(
    username
  )}`
);
    }

    router.replace("/dashboard");
  } catch (err) {
    console.error(err);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-6">
      <div className="w-full max-w-lg">
        {step === 1 && (
          <WelcomeStep
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <ProfileStep
            onContinue={(value) => {
              setUsername(value);
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <AvatarStep
  username={username}
  onContinue={finishOnboarding}
/>
        )}
      </div>
    </main>
  );
}