"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ArrowUpRight,
  ArrowDown,
  Landmark,
} from "lucide-react";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [quickActionsModalOpen, setQuickActionsModalOpen] =
    useState(false);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  useEffect(() => {
    const handleQuickActionsModal = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ open: boolean }>;

      setQuickActionsModalOpen(
        customEvent.detail?.open === true
      );
    };

    window.addEventListener(
      "arivo:quick-actions-modal",
      handleQuickActionsModal
    );

    return () => {
      window.removeEventListener(
        "arivo:quick-actions-modal",
        handleQuickActionsModal
      );
    };
  }, []);

  // Hide mobile bottom navigation while a Quick Action modal is open
  if (quickActionsModalOpen) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] border-t border-[#2b2b2b] bg-[#111111]/95 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex h-[60px] max-w-md items-end justify-between">
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={`flex flex-1 flex-col items-center justify-end gap-1 ${
            isActive("/dashboard")
              ? "text-[#efe5d2]"
              : "text-zinc-500"
          }`}
        >
          <Home size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">
            Dashboard
          </span>
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={() => router.push("/send")}
          className={`flex flex-1 flex-col items-center justify-end gap-1 ${
            isActive("/send")
              ? "text-[#efe5d2]"
              : "text-zinc-500"
          }`}
        >
          <ArrowUpRight size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">
            Send
          </span>
        </button>

        {/* Center Arivo */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          aria-label="Arivo Dashboard"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#efe5d2] shadow-xl"
        >
          <img
            src="/arivo-icon-black.png"
            alt="Arivo"
            className="h-8 w-8 object-contain"
          />
        </button>

        {/* Receive */}
        <button
          type="button"
          onClick={() => router.push("/receive")}
          className={`flex flex-1 flex-col items-center justify-end gap-1 ${
            isActive("/receive")
              ? "text-[#efe5d2]"
              : "text-zinc-500"
          }`}
        >
          <ArrowDown size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">
            Receive
          </span>
        </button>

        {/* Earn */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/earn")}
          className={`flex flex-1 flex-col items-center justify-end gap-1 ${
            isActive("/dashboard/earn")
              ? "text-[#efe5d2]"
              : "text-zinc-500"
          }`}
        >
          <Landmark size={20} strokeWidth={2} />
          <span className="text-[10px] font-medium">
            Earn
          </span>
        </button>
      </div>
    </nav>
  );
}