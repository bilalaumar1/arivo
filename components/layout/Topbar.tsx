"use client";

import { useEffect, useState } from "react";
import { Bell, Settings } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { getProfile } from "@/lib/profile";

export default function Topbar() {
  const { user } = usePrivy();

  const [username, setUsername] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!user?.wallet?.address) return;

      const profile = await getProfile(user.wallet.address);

      if (profile) {
        setUsername(profile.username.replace("@", ""));
      }
    }

    loadProfile();
  }, [user]);

  const userName =
    username ||
    user?.google?.name ||
    (user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
      : "User");

  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon";
  }

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#2b2b2b] bg-[#111111] px-7">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-white">
          {greeting}, {userName} 👋
        </h1>

        <p className="mt-1 text-[13px] text-zinc-500">
          Here's what's happening with your account today.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white">
          <Bell size={18} strokeWidth={2} />
        </button>

        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white">
          <Settings size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}