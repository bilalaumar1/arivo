"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getCurrentChainId,
  switchToArcNetwork,
} from "@/lib/network";
import { ARC_TESTNET } from "@/lib/arc";

import {
  Home,
  Send,
  ArrowDownLeft,
  CircleDollarSign,
  ReceiptText,
  Store,
  Users,
  Settings,
  ChevronRight,
  Circle,
  User,
  Shield,
  LogOut,
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
    name: "dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "send",
    href: "/send",
    icon: Send,
  },
  {
    name: "receive",
    href: "/receive",
    icon: ArrowDownLeft,
  },
  {
    name: "earn",
    href: "/dashboard/earn",
    icon: CircleDollarSign,
  },
  {
    name: "transactions",
    href: "/transactions",
    icon: ReceiptText,
  },
  {
    name: "merchant",
    href: "/merchant",
    icon: Store,
  },
  {
    name: "contacts",
    href: "/contacts",
    icon: Users,
  },
];

function Sidebar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = usePrivy();
  const { wallets } = useWallets();

  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [isArcNetwork, setIsArcNetwork] = useState(false);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  /* =========================
     Close menu when clicking outside
  ========================= */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const clickedDesktopMenu =
        menuRef.current?.contains(target);

      const clickedMobileMenu =
        mobileMenuRef.current?.contains(target);

      if (!clickedDesktopMenu && !clickedMobileMenu) {
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
     Mobile Sidebar
  ========================= */

  useEffect(() => {
    const openMobileSidebar = () => {
      setMobileSidebarOpen(true);
    };

    const closeMobileSidebar = () => {
      setMobileSidebarOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener(
      "arivo:open-mobile-sidebar",
      openMobileSidebar
    );

    window.addEventListener(
      "arivo:close-mobile-sidebar",
      closeMobileSidebar
    );

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "arivo:open-mobile-sidebar",
        openMobileSidebar
      );

      window.removeEventListener(
        "arivo:close-mobile-sidebar",
        closeMobileSidebar
      );

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  /* =========================
     Check Arc network
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function checkNetwork() {
      try {
        /*
         * First try the Privy embedded wallet.
         * This is important for Google login.
         */
        const privyWallet = wallets[0];

        if (privyWallet) {
          const provider = await privyWallet.getEthereumProvider();

          const chainId = await provider.request({
            method: "eth_chainId",
          });

          if (!cancelled) {
            setIsArcNetwork(
              String(chainId).toLowerCase() ===
                ARC_TESTNET.chainId.toLowerCase()
            );
          }

          return;
        }

        /*
         * No Privy wallet:
         * use external wallet / MetaMask.
         */
        const chainId = await getCurrentChainId();

        if (!cancelled) {
          setIsArcNetwork(
            chainId?.toLowerCase() ===
              ARC_TESTNET.chainId.toLowerCase()
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setIsArcNetwork(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingNetwork(false);
        }
      }
    }

    checkNetwork();

    /*
     * MetaMask / external wallet updates.
     */
    if (window.ethereum) {
      window.ethereum.on(
        "chainChanged",
        checkNetwork
      );
    }

    return () => {
      cancelled = true;

      if (window.ethereum) {
        window.ethereum.removeListener(
          "chainChanged",
          checkNetwork
        );
      }
    };
  }, [wallets]);

  /* =========================
     Load profile
  ========================= */

  useEffect(() => {
    let cancelled = false;

    const walletAddress =
      user?.wallet?.address ?? "";

    setProfileName("");
    setProfileAvatar("");

    if (!walletAddress) return;

    async function loadProfile() {
      try {
        const profile =
          await getProfile(walletAddress);

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

        setProfileAvatar(
          profile.avatar || ""
        );
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

    const refreshProfile = (event: Event) => {
      const customEvent =
        event as CustomEvent<{
          username?: string;
          avatar?: string | null;
          wallet?: string;
        }>;

      const updatedWallet =
        customEvent.detail?.wallet;

      if (
        updatedWallet &&
        updatedWallet.toLowerCase() !==
          walletAddress.toLowerCase()
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
     Switch Network
  ========================= */

  async function handleSwitchNetwork() {
    if (switchingNetwork) return;

    try {
      setSwitchingNetwork(true);

      /*
       * Google login / Privy embedded wallet
       */
      const privyWallet = wallets[0];

      if (privyWallet) {
  await privyWallet.switchChain(
    Number(ARC_TESTNET.chainId)
        );

        /*
         * Update UI immediately.
         * No page refresh needed.
         */
        setIsArcNetwork(true);

        return;
      }

      /*
       * External wallet / MetaMask
       */
      await switchToArcNetwork();

      /*
       * Verify the actual network after MetaMask switch.
       */
      const chainId =
        await getCurrentChainId();

      setIsArcNetwork(
        chainId?.toLowerCase() ===
          ARC_TESTNET.chainId.toLowerCase()
      );
    } catch (error) {
      console.error(
        "Failed to switch network:",
        error
      );
    } finally {
      setSwitchingNetwork(false);
    }
  }

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
    <>
      {/* =========================
          MOBILE SIDEBAR
      ========================= */}

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 flex w-[88vw] max-w-[360px] flex-col overflow-y-auto border-r border-[#2b2b2b] bg-[#181818] shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 pb-5 pt-5">
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

              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close sidebar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#353535] bg-[#202020] text-zinc-300 transition hover:bg-[#292929] hover:text-white"
              >
                <span className="text-2xl font-light leading-none">
                  ×
                </span>
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-col gap-1.5 px-4">
              {navigation.map((item) => {
                const Icon = item.icon;

                const isActive =
                  item.href !== "#" &&
                  (
                    pathname === item.href ||
                    (
                      item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`)
                    )
                  );

                return (
                  <button
                    type="button"
                    key={t("common", item.name)}
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      router.push(item.href);
                    }}
                    className={`flex h-[48px] w-full items-center justify-between rounded-2xl px-4 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--arivo-primary)] text-black"
                        : "text-zinc-300 hover:bg-[#242424] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} strokeWidth={2} />

                      <span className="text-[14px] font-medium">
                        {t("common", item.name)}
                      </span>
                    </div>

                    {isActive && (
                      <ChevronRight
                        size={17}
                        strokeWidth={2.3}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Arc Testnet */}
            <div className="mt-5 px-4">
              <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-white">
                      {isArcNetwork
                        ? "Arc Testnet"
                        : t("common", "wrongNetwork")}
                    </p>

                    <p
                      className={`mt-1 text-[11px] ${
                        isArcNetwork
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {loadingNetwork
                        ? t("common", "checking")
                        : isArcNetwork
                        ? t("common", "connected")
                        : t("common", "pleaseSwitch")}
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
                  type="button"
                  onClick={
                    isArcNetwork
                      ? () =>
                          window.open(
                            "https://testnet.arcscan.app",
                            "_blank",
                            "noopener,noreferrer"
                          )
                      : handleSwitchNetwork
                  }
                  disabled={
                    switchingNetwork ||
                    loadingNetwork
                  }
                  className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-[var(--arivo-primary)] text-[12px] font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {switchingNetwork
                    ? t("common", "switching")
                    : isArcNetwork
                    ? t("common", "viewExplorer")
                    : t("common", "switchNetwork")}
                </button>
              </div>
            </div>

            {/* Mobile User Card */}
            <div className="mt-auto px-4 pb-5 pt-5">
              <div
                ref={mobileMenuRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu(!openMenu)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#2b2b2b] bg-[#202020] px-3 py-3 transition hover:border-[#3a3a3a] hover:bg-[#262626]"
                >
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
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

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

                {openMenu && (
                  <div className="absolute bottom-[72px] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-[#2b2b2b] bg-[#1b1b1b] shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(false);
                        setMobileSidebarOpen(false);
                        router.push("/profile");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
                    >
                      <User size={16} />
                      <span>{t("common", "profile")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(false);
                        setMobileSidebarOpen(false);
                        router.push("/settings");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
                    >
                      <Settings size={16} />
                      <span>{t("common", "settings")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenMenu(false)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
                    >
                      <Shield size={16} />
                      <span>{t("common", "security")}</span>
                    </button>

                    <div className="mx-4 border-t border-[#2b2b2b]" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      <LogOut size={16} />
                      <span>{t("common", "signOut")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* =========================
          DESKTOP SIDEBAR
      ========================= */}

      <aside className="sticky top-0 hidden h-screen w-[228px] flex-col border-r border-[#2b2b2b] bg-[#181818] lg:flex">

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

          const isActive =
            item.href !== "#" &&
            (
              pathname === item.href ||
              (
                item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`)
              )
            );

          return (
            <button
              type="button"
              key={t("common", item.name)}
              onClick={() => router.push(item.href)}
              className={`flex h-[42px] w-full items-center justify-between rounded-2xl px-4 text-left transition-all duration-200 ${
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
                  {t("common", item.name)}
                </span>
              </div>

              {isActive && (
                <ChevronRight
                  size={15}
                  strokeWidth={2.3}
                />
              )}
            </button>
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
                  : t("common", "wrongNetwork")}
              </p>

              <p
                className={`mt-1 text-[11px] ${
                  isArcNetwork
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {loadingNetwork
                  ? t("common", "checking")
                  : isArcNetwork
                  ? t("common", "connected")
                  : t("common", "pleaseSwitch")}
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
  onClick={
    isArcNetwork
      ? () =>
          window.open(
            "https://testnet.arcscan.app",
            "_blank",
            "noopener,noreferrer"
          )
      : handleSwitchNetwork
  }
  disabled={
    switchingNetwork ||
    loadingNetwork
  }
  className="mt-4 flex h-9 w-full items-center justify-center rounded-xl bg-[var(--arivo-primary)] text-[12px] font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
>
  {switchingNetwork
    ? t("common", "switching")
    : isArcNetwork
    ? t("common", "viewExplorer")
    : t("common", "switchNetwork")}
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
              <span>{t("common", "profile")}</span>
            </button>

            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
            >
              <Settings size={16} />
              <span>{t("common", "settings")}</span>
            </button>

            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-300 transition hover:bg-[#262626] hover:text-white"
            >
              <Shield size={16} />
              <span>{t("common", "security")}</span>
            </button>

            <div className="mx-4 border-t border-[#2b2b2b]" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={16} />
              <span>{t("common", "signOut")}</span>
            </button>

          </div>
        )}
      </div>
      </aside>
    </>
  );
}

export default Sidebar;