"use client";

import { useEffect, useState } from "react";
import { Bell, MessageCircle, Settings } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import { getProfile } from "@/lib/profile";

export default function Topbar() {
  const { user } = usePrivy();
  const router = useRouter();

  const [username, setUsername] = useState("");

  // =========================
  // PROFILE
  // =========================

  useEffect(() => {
    async function loadProfile() {
      const wallet = user?.wallet?.address;

      if (!wallet) {
        setUsername("");
        return;
      }

      try {
        const profile = await getProfile(wallet);

        if (profile) {
          setUsername(profile.username.replace("@", ""));
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }

    loadProfile();
  }, [user]);

  // =========================
  // OPEN CHAT
  // =========================

  function openMessages() {
    router.push("/chat");
  }

  // =========================
  // USER NAME
  // =========================

  const userName =
    username ||
    user?.google?.name ||
    (user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
      : "User");

  // =========================
  // GREETING
  // =========================

  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon";
  }

  // =========================
  // UI
  // =========================

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#2b2b2b] bg-[#111111] px-7">
      {/* LEFT */}

      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-white">
          {greeting}, {userName} 👋
        </h1>

        <p className="mt-1 text-[13px] text-zinc-500">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3">
        {/* MESSAGES */}

        <button
          type="button"
          onClick={openMessages}
          aria-label="Messages"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
        >
          <MessageCircle
            size={18}
            strokeWidth={2}
          />
        </button>

        {/* NOTIFICATIONS */}

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
        >
          <Bell
            size={18}
            strokeWidth={2}
          />
        </button>

        {/* SETTINGS */}

        <button
          type="button"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
        >
          <Settings
            size={18}
            strokeWidth={2}
          />
        </button>
      </div>
    </header>
  );
}