"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  getCurrentChainId,
  switchToArcNetwork,
} from "@/lib/network";
import { ARC_TESTNET } from "@/lib/arc";

import {
  Home,
  Send,
  ArrowDownLeft,
  ReceiptText,
  Store,
  Users,
  Settings,
  ChevronRight,
  Circle,
  User,
  Shield,
  LogOut,
  ArrowLeft,
  Check,
  Copy,
  Wallet,
} from "lucide-react";

type Asset = "USDC" | "EURC";

const ASSETS: Record<Asset, { name: string; logo: string }> = {
  USDC: {
    name: "USD Coin",
    logo: "/usdc.png",
  },
  EURC: {
    name: "Euro Coin",
    logo: "/eurc.png",
  },
};

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Send",
    href: "/send",
    icon: Send,
  },
  {
    name: "Receive",
    href: "/receive",
    icon: ArrowDownLeft,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: ReceiptText,
  },
  {
    name: "Merchant",
    href: "/merchant",
    icon: Store,
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = usePrivy();

  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [isArcNetwork, setIsArcNetwork] = useState(false);
  const [loadingNetwork, setLoadingNetwork] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);

  /* =========================
     Close menu when clicking outside
  ========================= */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================
     Check Arc network
  ========================= */

  useEffect(() => {
    async function checkNetwork() {
      try {
        const chainId = await getCurrentChainId();

        setIsArcNetwork(
          chainId?.toLowerCase() ===
            ARC_TESTNET.chainId.toLowerCase()
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingNetwork(false);
      }
    }

    checkNetwork();

    if (window.ethereum) {
      window.ethereum.on(
        "chainChanged",
        checkNetwork
      );
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "chainChanged",
          checkNetwork
        );
      }
    };
  }, []);

  /* =========================
     Load profile
  ========================= */

  useEffect(() => {
    let cancelled = false;

    const walletAddress = user?.wallet?.address ?? "";

    // Clear the previous user's profile immediately.
    setProfileName("");
    setProfileAvatar("");

    if (!walletAddress) return;

    async function loadProfile() {
      try {
        const profile = await getProfile(walletAddress);

        // Ignore a request that belongs to an old wallet.
        if (cancelled) return;

        if (!profile) {
          setProfileName("");
          setProfileAvatar("");
          return;
        }

        setProfileName(
          profile.username
            ? profile.username.replace("@", "")
            : ""
        );

        setProfileAvatar(profile.avatar || "");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Failed to load sidebar profile:",
          error
        );

        setProfileName("");
        setProfileAvatar("");
      }
    }

    loadProfile();

    // Refresh only for the currently connected wallet.
    const refreshProfile = (event: Event) => {
      const customEvent = event as CustomEvent<{
        username?: string;
        avatar?: string | null;
        wallet?: string;
      }>;

      const updatedWallet = customEvent.detail?.wallet;

      if (
        updatedWallet &&
        updatedWallet.toLowerCase() !== walletAddress.toLowerCase()
      ) {
        return;
      }

      loadProfile();
    };

    window.addEventListener(
      "arivo-profile-updated",
      refreshProfile
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "arivo-profile-updated",
        refreshProfile
      );
    };
  }, [user?.wallet?.address]);
  /* =========================
     Logout
  ========================= */

  const handleLogout = async () => {
    setOpenMenu(false);

    await logout();

    router.replace("/");
  };

  /* =========================
     User information
  ========================= */

  const name =
    profileName ||
    user?.google?.name ||
    (user?.wallet?.address
      ? `${user.wallet.address.slice(
          0,
          6
        )}...${user.wallet.address.slice(-4)}`
      : "User");

  const subtitle =
    user?.google?.email ??
    user?.wallet?.address ??
    "No wallet";

  return (
    <aside className="sticky top-0 flex h-screen w-[228px] flex-col border-r border-[#2b2b2b] bg-[#181818]">

      {/* =========================
          Logo
      ========================= */}

      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">

          <Image
            src="/arivo-icon.png"
            alt="Arivo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />

          <h1 className="text-[21px] font-semibold text-white">
            Arivo
          </h1>

        </div>
      </div>

      {/* =========================
          Navigation
      ========================= */}

      <nav className="mt-5 flex flex-col gap-1.5 px-4">

        {navigation.map((item) => {
          const Icon = item.icon;

          /*
            IMPORTANT:

            pathname === item.href

            Example:

            /dashboard → Dashboard active
            /send      → Send active
          */

          const isActive =
            item.href !== "#" &&
            (pathname === item.href ||
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex h-[42px] items-center justify-between rounded-2xl px-4 transition-all duration-200 ${
                isActive
                  ? "bg-[var(--arivo-primary)] text-black"
                  : "text-zinc-400 hover:bg-[#242424] hover:text-white"
              }`}
            >

              <div className="flex items-center gap-3">

                <Icon
                  size={15}
                  strokeWidth={2}
                />

                <span className="text-[12px] font-medium">
                  {item.name}
                </span>

              </div>

              {/* Arrow only for active page */}

              {isActive && (
                <ChevronRight
                  size={15}
                  strokeWidth={2.3}
                />
              )}

            </Link>
          );
        })}

      </nav>

      {/* =========================
          Arc Testnet
      ========================= */}

      <div className="mt-5 px-4">

        <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-3.5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[13px] font-semibold text-white">
                {isArcNetwork
                  ? "Arc Testnet"
                  : "Wrong Network"}
              </p>

              <p
                className={`mt-1 text-[11px] ${
                  isArcNetwork
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {loadingNetwork
                  ? "Checking..."
                  : isArcNetwork
                  ? "Connected"
                  : "Please switch"}
              </p>

            </div>

            <Circle
              size={8}
              fill="#22c55e"
              className="text-green-500"
            />

          </div>

          <div className="mt-4 space-y-2.5">

            <div className="flex items-center justify-between">

              <span className="text-[11px] text-zinc-500">
                Status
              </span>

              <span className="text-[11px] font-medium text-green-500">
                Online
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-[11px] text-zinc-500">
                Block
              </span>

              <span className="text-[11px] text-white">
                521,991
              </span>

            </div>

            <div className="flex items-center justify-between">

              <span className="text-[11px] text-zinc-500">
                RPC
              </span>

              <span className="text-[11px] text-white">
                118 ms
              </span>

            </div>

          </div>

          <button
            onClick={switchToArcNetwork}
            className="mt-4 flex h-9 w-full items-center justify-center rounded-xl bg-[var(--arivo-primary)] text-[12px] font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)]"
          >
            {isArcNetwork
              ? "View Explorer"
              : "Switch Network"}
          </button>

        </div>

      </div>

      {/* =========================
          Push user card to bottom
      ========================= */}

      <div className="flex-1" />

      {/* =========================
          User Card
      ========================= */}

      <div
        ref={menuRef}
        className="relative px-4 pb-4"
      >

        <button
          onClick={() =>
            setOpenMenu(!openMenu)
          }
          className="flex w-full items-center gap-3 rounded-2xl border border-[#2b2b2b] bg-[#202020] px-3 py-2.5 transition hover:border-[#3a3a3a] hover:bg-[#262626]"
        >

          {/* Avatar */}

          {profileAvatar ? (
            <Image
              src={profileAvatar}
              alt={name}
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 shrink-0 rounded-full border border-[#2b2b2b]"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--arivo-primary)]">

              <span className="text-sm font-bold text-black">
                {name
                  .charAt(0)
                  .toUpperCase()}
              </span>

            </div>
          )}

          {/* User Info */}

          <div className="min-w-0 flex-1 text-left">

            <h3 className="truncate text-[13px] font-semibold text-white">
              {name}
            </h3>

            <p className="truncate text-[11px] text-zinc-500">
              {subtitle.length > 22
                ? `${subtitle.slice(
                    0,
                    10
                  )}...${subtitle.slice(-6)}`
                : subtitle}
            </p>

          </div>

          <ChevronRight
            size={15}
            className={`shrink-0 text-zinc-500 transition-transform ${
              openMenu
                ? "rotate-90"
                : ""
            }`}
          />

        </button>

        {/* =========================
            Dropdown
        ========================= */}

        {openMenu && (
          <div className="absolute bottom-[72px] left-4 right-4 z-50 overflow-hidden rounded-2xl border border-[#2b2b2b] bg-[#1b1b1b] shadow-2xl">

            <button
              onClick={() => {
                setOpenMenu(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
            >
              <User size={16} />
              <span>Profile</span>
            </button>

            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
            >
              <Shield size={16} />
              <span>Security</span>
            </button>

            <div className="mx-4 border-t border-[#2b2b2b]" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>

          </div>
        )}

      </div>

    </aside>
  );
}

export default Sidebar;
