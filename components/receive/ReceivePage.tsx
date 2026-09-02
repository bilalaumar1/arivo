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
    logo: "/usdc-logo.png",
  },
  EURC: {
    name: "Euro Coin",
    logo: "/eurc-logo.png",
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      window.ethereum.on("chainChanged", checkNetwork);
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

  useEffect(() => {
    async function loadProfile() {
      if (!user?.wallet?.address) return;

      const profile = await getProfile(
        user.wallet.address
      );

      if (!profile) return;

      if (profile.username) {
        setProfileName(
          profile.username.replace("@", "")
        );
      }

      if (profile.avatar) {
        setProfileAvatar(profile.avatar);
      }
    }

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    setOpenMenu(false);

    await logout();

    router.replace("/");
  };

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
    <aside className="sticky top-0 z-50 flex h-screen w-[228px] shrink-0 flex-col border-r border-[#2b2b2b] bg-[#181818] pointer-events-auto">

      {/* Logo */}
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

      {/* Navigation */}
      <nav className="mt-5 flex flex-col gap-1.5 px-4">
        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href !== "#" &&
            pathname === item.href;

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

      {/* Arc Testnet */}
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
            onClick={() => switchToArcNetwork()}
            className="mt-4 flex h-9 w-full items-center justify-center rounded-xl bg-[var(--arivo-primary)] text-[12px] font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)]"
          >
            {isArcNetwork
              ? "View Explorer"
              : "Switch Network"}
          </button>
        </div>
      </div>

      {/* Push user card to bottom */}
      <div className="flex-1" />

      {/* User Card */}
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
              openMenu ? "rotate-90" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
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

function ReceivePage() {
  const { user } = usePrivy();
  const [asset, setAsset] = useState<Asset>("USDC");
  const [copied, setCopied] =
    useState<"wallet" | "arivo" | "">("");

  const walletAddress =
    user?.wallet?.address ||
    "0x0000000000000000000000000000000000000000";

  const arivoId = walletAddress
    ? `ARV-${walletAddress
        .slice(2, 6)
        .toUpperCase()}-${walletAddress
        .slice(-4)
        .toUpperCase()}`
    : "ARV-XXXX-XXXX";

  const qrValue = `${asset}:${walletAddress}`;

  async function copyText(
    value: string,
    type: "wallet" | "arivo"
  ) {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(type);

      setTimeout(() => {
        setCopied("");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function shortenAddress(address: string) {
    if (!address) return "Not connected";

    if (address.length < 14) return address;

    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar />

      {/* MAIN */}
      <main className="relative z-0 min-w-0 flex-1">

        {/* HEADER */}
        <header className="flex h-[90px] items-center border-b border-[#292929] px-6 lg:px-9">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mr-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-[27px] font-semibold">
              Receive
            </h1>

            <p className="mt-1 text-[13px] text-zinc-500">
              Receive USDC or EURC on Arc Testnet.
            </p>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-5 lg:p-7">
          <div className="grid grid-cols-12 gap-5">

            {/* LEFT */}
            <section className="col-span-12 lg:col-span-8">
              <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-6 lg:p-7">

                {/* TITLE */}
                <div className="mb-6">
                  <h2 className="text-[19px] font-semibold">
                    Receive funds
                  </h2>

                  <p className="mt-1 text-[13px] text-zinc-500">
                    Share your wallet address or QR code to receive funds.
                  </p>
                </div>

                {/* ASSET */}
                <div>
                  <label className="mb-3 block text-[13px] text-zinc-400">
                    Asset
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(ASSETS) as Asset[]).map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setAsset(item)
                          }
                          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                            asset === item
                              ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                              : "border-[#353535] bg-[#202020] text-white hover:border-[#555]"
                          }`}
                        >
                          <img
                            src={ASSETS[item].logo}
                            alt={item}
                            className="h-10 w-10 rounded-full"
                          />

                          <div>
                            <p className="font-semibold">
                              {item}
                            </p>

                            <p
                              className={`mt-1 text-[12px] ${
                                asset === item
                                  ? "text-zinc-600"
                                  : "text-zinc-500"
                              }`}
                            >
                              {ASSETS[item].name}
                            </p>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* QR + ADDRESS */}
                <div className="mt-7 grid gap-5 md:grid-cols-[220px_1fr]">

                  {/* QR */}
                  <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#353535] bg-[#202020] p-5">
                    <div className="rounded-2xl bg-white p-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(
                          qrValue
                        )}`}
                        alt="Wallet QR Code"
                        className="h-[180px] w-[180px]"
                      />
                    </div>

                    <p className="mt-4 text-center text-[12px] text-zinc-500">
                      Scan to receive
                    </p>
                  </div>

                  {/* DETAILS */}
                  <div className="flex flex-col gap-5">

                    {/* Wallet */}
                    <div>
                      <label className="mb-3 block text-[13px] text-zinc-400">
                        Wallet Address
                      </label>

                      <div className="flex min-h-[62px] items-center gap-3 rounded-2xl border border-[#353535] bg-[#202020] px-5">
                        <Wallet
                          size={18}
                          className="shrink-0 text-zinc-500"
                        />

                        <p className="min-w-0 flex-1 truncate text-[13px] text-white">
                          {walletAddress}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              walletAddress,
                              "wallet"
                            )
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#353535] bg-[#292929] text-zinc-300 transition hover:bg-[#333]"
                        >
                          {copied === "wallet" ? (
                            <Check
                              size={16}
                              className="text-green-500"
                            />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Arivo ID */}
                    <div>
                      <label className="mb-3 block text-[13px] text-zinc-400">
                        Arivo ID
                      </label>

                      <div className="flex min-h-[62px] items-center gap-3 rounded-2xl border border-[#353535] bg-[#202020] px-5">
                        <p className="flex-1 text-[14px] font-medium text-white">
                          {arivoId}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              arivoId,
                              "arivo"
                            )
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#353535] bg-[#292929] text-zinc-300 transition hover:bg-[#333]"
                        >
                          {copied === "arivo" ? (
                            <Check
                              size={16}
                              className="text-green-500"
                            />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NETWORK */}
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#353535] bg-[#202020] px-5 py-4">
                  <div>
                    <p className="text-[12px] text-zinc-500">
                      Network
                    </p>

                    <p className="mt-1 text-[14px] font-semibold text-white">
                      Arc Testnet
                    </p>
                  </div>

                  <span className="rounded-lg bg-[#2b2b2b] px-3 py-2 text-[11px] text-zinc-400">
                    Testnet
                  </span>
                </div>
              </div>
            </section>

            {/* RIGHT */}
            <aside className="col-span-12 space-y-5 lg:col-span-4">

              {/* RECEIVE SUMMARY */}
              <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[17px] font-semibold text-white">
                      Receive summary
                    </h2>

                    <p className="mt-1 text-[12px] text-zinc-600">
                      Your receiving details
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#303030] bg-[#202020]">
                    <ArrowDownLeft
                      size={18}
                      className="text-zinc-400"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-zinc-500">
                      Asset
                    </span>

                    <span className="text-[13px] font-semibold text-white">
                      {asset}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="text-[13px] text-zinc-500">
                      Network
                    </span>

                    <span className="text-[13px] font-semibold text-white">
                      Arc Testnet
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="text-[13px] text-zinc-500">
                      Address
                    </span>

                    <span className="max-w-[180px] truncate text-right text-[12px] text-zinc-300">
                      {shortenAddress(walletAddress)}
                    </span>
                  </div>

                  <div className="h-px bg-[#2a2a2a]" />

                  <div className="rounded-2xl border border-[#303030] bg-[#202020] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efe5d2] text-black">
                        <ArrowDownLeft size={18} />
                      </div>

                      <div>
                        <p className="text-[13px] font-semibold text-white">
                          Ready to receive
                        </p>

                        <p className="mt-1 text-[11px] text-zinc-500">
                          Share your address with the sender.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURE RECEIVE */}
              <div className="rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#303030] bg-[#242424]">
                    <Check
                      size={18}
                      className="text-[#efe5d2]"
                    />
                  </div>

                  <div>
                    <h3 className="text-[14px] font-semibold text-white">
                      Secure receive
                    </h3>

                    <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                      Only send {asset} on Arc Testnet to this wallet address.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#2d2d2d] bg-[#202020] px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-green-500" />

                  <span className="text-[12px] font-medium text-zinc-300">
                    Arc Testnet
                  </span>

                  <span className="ml-auto text-[11px] font-medium text-green-500">
                    Connected
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ReceivePage;