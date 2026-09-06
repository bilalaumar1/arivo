"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  Globe,
  LogOut,
  Shield,
  SlidersHorizontal,
  User,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePrivy } from "@privy-io/react-auth";
import { useToast } from "@/components/toast/ToastProvider";

const PICTURES_BUCKET = "pictures";

function generateArivoId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let part1 = "";
  let part2 = "";

  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }

  return `ARV-${part1}-${part2}`;
}

function shortenAddress(address: string) {
  if (!address) return "";

  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function SettingsRow({
  icon,
  title,
  description,
  right,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  right?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition lg:gap-4 lg:px-5 lg:py-4 ${
        active
          ? "bg-[#242424]"
          : "hover:bg-[#1d1d1d]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400 lg:h-12 lg:w-12">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-medium text-zinc-200">
            {title}
          </p>

          <p className="mt-1 truncate text-[13px] text-zinc-500">
            {description}
          </p>
        </div>
      </div>

      {right && (
        <div className="shrink-0 text-zinc-500">
          {right}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] =
    useState("profile");

  const { user, logout } = usePrivy();
  const { success, error } = useToast();

  const walletAddress =
    user?.wallet?.address ?? "";

  const [transactionNotifications, setTransactionNotifications] =
    useState(true);

  const [paymentNotifications, setPaymentNotifications] =
    useState(true);

  useEffect(() => {
    if (!walletAddress) return;

    try {
      const raw = window.localStorage.getItem(
        `arivo:notification-settings:${walletAddress.toLowerCase()}`
      );

      if (!raw) return;

      const saved = JSON.parse(raw) as {
        transactions?: boolean;
        payments?: boolean;
      };

      if (typeof saved.transactions === "boolean") {
        setTransactionNotifications(saved.transactions);
      }

      if (typeof saved.payments === "boolean") {
        setPaymentNotifications(saved.payments);
      }
    } catch (storageError) {
      console.error("FAILED TO LOAD NOTIFICATION SETTINGS:", storageError);
    }
  }, [walletAddress]);

  const saveNotificationSettings = (
    nextTransactions: boolean,
    nextPayments: boolean
  ) => {
    if (!walletAddress) return;

    try {
      window.localStorage.setItem(
        `arivo:notification-settings:${walletAddress.toLowerCase()}`,
        JSON.stringify({
          transactions: nextTransactions,
          payments: nextPayments,
        })
      );

      window.dispatchEvent(
        new CustomEvent("arivo-notification-settings-updated", {
          detail: {
            wallet: walletAddress,
            transactions: nextTransactions,
            payments: nextPayments,
          },
        })
      );
    } catch (storageError) {
      console.error("FAILED TO SAVE NOTIFICATION SETTINGS:", storageError);
    }
  };

  const [avatar, setAvatar] =
    useState<string | null>(null);

  const [name, setName] = useState("");

  const [arivoId, setArivoId] =
    useState("");

  const [showEditProfile, setShowEditProfile] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [disconnecting, setDisconnecting] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * LOAD CURRENT USER PROFILE
   *
   * IMPORTANT:
   * Every time the connected wallet changes,
   * we immediately clear the previous user's
   * profile from React state.
   *
   * This prevents:
   *
   * User A -> logout
   * User B -> login
   *
   * from temporarily or permanently showing
   * User A's profile for User B.
   */
  useEffect(() => {
    let mounted = true;

    // ALWAYS clear previous user's data first.
    setName("");
    setAvatar(null);
    setArivoId("");
    setSaveMessage("");

    async function loadProfile() {
      if (!walletAddress) {
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "username, avatar, wallet, arivo_id"
          )
          .eq("wallet", walletAddress)
          .maybeSingle();

        if (error) {
          console.error(
            "LOAD PROFILE ERROR:",
            error
          );
          return;
        }

        if (!mounted) {
          return;
        }

        /*
         * No profile exists for this wallet.
         * Keep the state empty.
         */
        if (!data) {
          console.log(
            "NO PROFILE FOUND FOR WALLET:",
            walletAddress
          );

          return;
        }

        /*
         * Safety check:
         * never apply a profile that does not
         * belong to the currently connected wallet.
         */
        if (
          data.wallet?.toLowerCase() !==
          walletAddress.toLowerCase()
        ) {
          console.error(
            "PROFILE WALLET MISMATCH",
            {
              connectedWallet:
                walletAddress,
              profileWallet:
                data.wallet,
            }
          );

          return;
        }

        console.log(
          "CURRENT USER WALLET:",
          walletAddress
        );

        console.log(
          "PROFILE LOADED:",
          data
        );

        setName(data.username || "");
        setAvatar(data.avatar || null);
        setArivoId(data.arivo_id || "");
      } catch (error) {
        console.error(
          "FAILED TO LOAD ARIVO PROFILE:",
          error
        );
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  /*
   * UPLOAD PROFILE PICTURE
   */
  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!walletAddress) {
      setSaveMessage(
        "Connect your Arivo wallet first."
      );

      event.target.value = "";

      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setSaveMessage(
        "Please select a valid image."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size > 5 * 1024 * 1024
    ) {
      setSaveMessage(
        "Image must be smaller than 5MB."
      );

      event.target.value = "";

      return;
    }

    try {
      setUploading(true);
      setSaveMessage("");

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      /*
       * UNIQUE PROFILE PATH
       *
       * Every wallet has its own file.
       *
       * Example:
       *
       * profiles/
       * 0x123....jpg
       */
      const filePath =
        `profiles/${walletAddress.toLowerCase()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(PICTURES_BUCKET)
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type,
          }
        );

      if (uploadError) {
        throw new Error(
          uploadError.message
        );
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from(PICTURES_BUCKET)
        .getPublicUrl(
          filePath
        );

      const publicUrl =
        publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error(
          "Unable to create public picture URL."
        );
      }

      const finalUrl =
        `${publicUrl}?v=${Date.now()}`;

      /*
       * Update UI immediately.
       */
      setAvatar(finalUrl);

      /*
       * Find CURRENT wallet profile.
       */
      const {
        data: existingProfile,
        error: findError,
      } = await supabase
        .from("profiles")
        .select(
          "wallet, username, arivo_id"
        )
        .eq(
          "wallet",
          walletAddress
        )
        .maybeSingle();

      if (findError) {
        throw new Error(
          findError.message
        );
      }

      /*
       * UPDATE CURRENT USER ONLY.
       */
      if (existingProfile) {
        const {
          error: updateError,
        } = await supabase
          .from("profiles")
          .update({
            avatar: finalUrl,
          })
          .eq(
            "wallet",
            walletAddress
          );

        if (updateError) {
          throw new Error(
            updateError.message
          );
        }
      }

      /*
       * CREATE PROFILE ONLY FOR CURRENT USER.
       */
      else {
        const newArivoId =
          arivoId ||
          generateArivoId();

        const {
          error: insertError,
        } = await supabase
          .from("profiles")
          .insert({
            username:
              name.trim() ||
              "Arivo User",
            avatar: finalUrl,
            wallet:
              walletAddress,
            arivo_id:
              newArivoId,
          });

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }

        setArivoId(newArivoId);
      }

      /*
       * Tell Sidebar / other components
       * that THIS wallet's profile changed.
       */
      window.dispatchEvent(
        new CustomEvent(
          "arivo-profile-updated",
          {
            detail: {
              username: name,
              avatar: finalUrl,
              wallet:
                walletAddress,
            },
          }
        )
      );

      success(
        "Profile picture updated",
        "Your new profile picture has been saved successfully."
      );
    } catch (err) {
      console.error(
        "FAILED TO UPLOAD PICTURE:",
        err
      );

      error(
        "Picture upload failed",
        err instanceof Error
          ? err.message
          : "Unable to upload picture."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  };

  /*
   * SAVE PROFILE
   */
  const handleSaveProfile =
    async () => {
      const cleanName =
        name.trim();

      if (!walletAddress) {
        setSaveMessage(
          "Connect your Arivo wallet first."
        );

        return;
      }

      if (!cleanName) {
        setSaveMessage(
          "Please enter a display name."
        );

        return;
      }

      try {
        setSaving(true);
        setSaveMessage("");

        /*
         * Check ONLY current wallet.
         */
        const {
          data: existingProfile,
          error: findError,
        } = await supabase
          .from("profiles")
          .select(
            "wallet, username, avatar, arivo_id"
          )
          .eq(
            "wallet",
            walletAddress
          )
          .maybeSingle();

        if (findError) {
          throw new Error(
            findError.message
          );
        }

        /*
         * UPDATE CURRENT USER.
         */
        if (existingProfile) {
          const {
            data,
            error,
          } = await supabase
            .from("profiles")
            .update({
              username:
                cleanName,
              avatar:
                avatar || null,
            })
            .eq(
              "wallet",
              walletAddress
            )
            .select(
              "username, avatar, wallet, arivo_id"
            )
            .maybeSingle();

          if (error) {
            throw new Error(
              error.message
            );
          }

          if (data) {
            setName(
              data.username ||
                cleanName
            );

            setAvatar(
              data.avatar ||
                null
            );

            setArivoId(
              data.arivo_id ||
                arivoId
            );
          }
        }

        /*
         * CREATE CURRENT USER.
         */
        else {
          const newArivoId =
            arivoId ||
            generateArivoId();

          const {
            data,
            error,
          } = await supabase
            .from("profiles")
            .insert({
              username:
                cleanName,
              avatar:
                avatar || null,
              wallet:
                walletAddress,
              arivo_id:
                newArivoId,
            })
            .select(
              "username, avatar, wallet, arivo_id"
            )
            .single();

          if (error) {
            throw new Error(
              error.message
            );
          }

          if (data) {
            setName(
              data.username ||
                cleanName
            );

            setAvatar(
              data.avatar ||
                null
            );

            setArivoId(
              data.arivo_id ||
                newArivoId
            );
          }
        }

        /*
         * Notify Sidebar.
         */
        window.dispatchEvent(
          new CustomEvent(
            "arivo-profile-updated",
            {
              detail: {
                username:
                  cleanName,
                avatar:
                  avatar || null,
                wallet:
                  walletAddress,
              },
            }
          )
        );

        success(
          "Profile saved",
          "Your Arivo profile has been updated successfully."
        );

        window.setTimeout(
          () => {
            setSaveMessage("");
            setShowEditProfile(
              false
            );
          },
          700
        );
      } catch (err) {
        console.error(
          "FAILED TO SAVE PROFILE:",
          err
        );

        error(
          "Profile update failed",
          err instanceof Error
            ? err.message
            : "Unable to save profile."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * COPY WALLET
   */
  const copyWallet =
    async () => {
      if (!walletAddress) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          walletAddress
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1800
        );
      } catch {
        setCopied(false);
      }
    };

  /*
   * AVATAR
   */
  const renderAvatar =
    (small = false) => {
      return (
        <div
          className={`overflow-hidden rounded-xl border border-[#343434] bg-[#202020] ${
            small
              ? "h-12 w-12"
              : "h-14 w-14"
          } flex shrink-0 items-center justify-center`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt="Profile avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <User
              size={
                small
                  ? 22
                  : 24
              }
              strokeWidth={1.8}
              className="text-zinc-400"
            />
          )}
        </div>
      );
    };

  return (
    <div className="min-h-full bg-[#111111] text-white">

      {/* HEADER */}
      <header className="border-b border-[#292929]">
        <div className="flex min-h-[96px] items-center justify-between px-4 py-5 lg:min-h-[116px] lg:px-8 lg:py-6">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() =>
                window.history.back()
              }
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#343434] bg-[#1b1b1b] text-zinc-300 transition hover:bg-[#242424]"
              aria-label="Go back"
            >
              <ArrowLeft
                size={21}
              />
            </button>

            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] lg:text-[30px]">
                Settings
              </h1>

              <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                Manage your Arivo account, security and preferences.
              </p>
            </div>

          </div>



        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-8">

        {/* SIDEBAR */}
        <aside className="h-fit min-w-0 overflow-hidden rounded-2xl border border-[#2c2c2c] bg-[#171717]">

          <div className="p-2">

            {/* PROFILE */}
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "profile"
                )
              }
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                activeSection ===
                "profile"
                  ? "bg-[#f1e8d5] text-[#111111]"
                  : "text-zinc-400 hover:bg-[#222222]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    activeSection ===
                    "profile"
                      ? "border-[#ddd1b9] bg-[#e8dfcc]"
                      : "border-[#343434] bg-[#202020]"
                  }`}
                >
                  <User
                    size={19}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[15px] font-medium">
                    Profile
                  </p>

                  <p
                    className={`mt-0.5 truncate text-[12px] ${
                      activeSection ===
                      "profile"
                        ? "text-[#625b4d]"
                        : "text-zinc-500"
                    }`}
                  >
                    Manage your Arivo identity
                  </p>
                </div>

              </div>

              <ChevronRight
                size={18}
              />
            </button>

            {/* SECURITY */}
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "security"
                )
              }
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                activeSection ===
                "security"
                  ? "bg-[#242424]"
                  : "hover:bg-[#202020]"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400">
                <Shield
                  size={19}
                />
              </div>

              <div>
                <p className="text-[15px] font-medium text-zinc-300">
                  Security
                </p>

                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Protect your account and wallet
                </p>
              </div>
            </button>

            {/* NOTIFICATIONS */}
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "notifications"
                )
              }
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                activeSection ===
                "notifications"
                  ? "bg-[#242424]"
                  : "hover:bg-[#202020]"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400">
                <Bell
                  size={19}
                />
              </div>

              <div>
                <p className="text-[15px] font-medium text-zinc-300">
                  Notifications
                </p>

                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Choose what you want to receive
                </p>
              </div>
            </button>

            {/* PREFERENCES */}
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "preferences"
                )
              }
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                activeSection ===
                "preferences"
                  ? "bg-[#242424]"
                  : "hover:bg-[#202020]"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400">
                <SlidersHorizontal
                  size={19}
                />
              </div>

              <div>
                <p className="text-[15px] font-medium text-zinc-300">
                  Preferences
                </p>

                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Customize your Arivo experience
                </p>
              </div>
            </button>

            {/* WALLET */}
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "wallet"
                )
              }
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                activeSection ===
                "wallet"
                  ? "bg-[#242424]"
                  : "hover:bg-[#202020]"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400">
                <Wallet
                  size={19}
                />
              </div>

              <div>
                <p className="text-[15px] font-medium text-zinc-300">
                  Wallet & Network
                </p>

                <p className="mt-0.5 text-[12px] text-zinc-500">
                  View wallet and network details
                </p>
              </div>
            </button>

          </div>

          <div className="mx-4 border-t border-[#2b2b2b]" />

          {/* DISCONNECT */}
          <button
            type="button"
            disabled={disconnecting}
            onClick={async () => {
              if (disconnecting) return;

              setDisconnecting(true);

              try {
                await logout();
              } catch (err) {
                // Privy can return a logout/session API error while the
                // client still needs to leave the protected page.
                console.error("PRIVY LOGOUT ERROR:", err);
              } finally {
                // Always leave Settings after Disconnect.
                // A hard navigation also forces Privy to re-initialize
                // its authentication state on the login page.
                window.location.replace("/");
              }
            }}
            className="flex w-full items-center gap-3 px-6 py-5 text-left transition hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#343434] bg-[#202020] text-zinc-400">
              <LogOut
                size={19}
              />
            </div>

            <div>
              <p className="text-[15px] font-medium text-zinc-300">
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </p>

              <p className="mt-0.5 text-[12px] text-zinc-500">
                {disconnecting
                  ? "Disconnecting your wallet"
                  : "Disconnect your wallet"}
              </p>
            </div>
          </button>

        </aside>

        {/* MAIN */}
        <main className="min-w-0">

          {/* PROFILE */}
          {activeSection ===
            "profile" && (
            <section>

              <div className="mb-6">
                <h2 className="text-[22px] font-semibold lg:text-[25px]">
                  Profile
                </h2>

                <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                  Manage your Arivo identity and account information.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#171717]">

                {/* PROFILE HEADER */}
                <div className="flex items-center justify-between gap-6 border-b border-[#2b2b2b] px-6 py-5">

                  <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                    {renderAvatar(
                      true
                    )}

                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold text-zinc-100">
                        {name ||
                          "Arivo User"}
                      </h3>

                      <p className="mt-1 text-[13px] text-zinc-500">
                        Your Arivo identity
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSaveMessage(
                        ""
                      );

                      setShowEditProfile(
                        true
                      );
                    }}
                    className="flex h-10 w-[130px] lg:h-12 lg:w-[180px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#373737] bg-[#1d1d1d] px-3 text-[12px] font-medium lg:px-4 lg:text-[14px] text-zinc-200 transition hover:bg-[#252525]"
                  >
                    <Edit3
                      size={16}
                    />

                    Edit profile
                  </button>

                </div>

                {/* ARIVO ID */}
                <SettingsRow
                  icon={
                    <User
                      size={21}
                    />
                  }
                  title="Arivo ID"
                  description="Your unique identity on Arivo"
                  right={
                    <span className="flex h-10 w-[130px] lg:h-12 lg:w-[180px] items-center justify-center rounded-xl border border-[#373737] bg-[#1d1d1d] px-3 text-[12px] font-medium lg:px-4 lg:text-[14px] text-zinc-200">
                      {arivoId ||
                        "—"}
                    </span>
                  }
                />

                {/* WALLET */}
                <div className="border-t border-[#2b2b2b]">
                  <SettingsRow
                    icon={
                      <Wallet
                        size={21}
                      />
                    }
                    title="Wallet address"
                    description="Your connected wallet"
                    right={
                      <button
                        type="button"
                        onClick={
                          copyWallet
                        }
                        className="flex h-10 w-[130px] lg:h-12 lg:w-[180px] items-center justify-between gap-3 rounded-xl border border-[#373737] bg-[#1d1d1d] px-4 transition hover:bg-[#252525]"
                      >
                        <span className="truncate text-[14px] text-zinc-200">
                          {shortenAddress(
                            walletAddress
                          ) ||
                            "Not connected"}
                        </span>

                        {copied ? (
                          <Check
                            size={
                              17
                            }
                            className="shrink-0 text-[#22c55e]"
                          />
                        ) : (
                          <Copy
                            size={
                              17
                            }
                            className="shrink-0 text-zinc-400"
                          />
                        )}
                      </button>
                    }
                  />
                </div>

                {/* NETWORK */}
                <div className="border-t border-[#2b2b2b]">
                  <SettingsRow
                    icon={
                      <Globe
                        size={21}
                      />
                    }
                    title="Network"
                    description="Current blockchain network"
                    right={
                      <div className="flex h-10 w-[130px] lg:h-12 lg:w-[180px] items-center justify-center gap-2 rounded-xl border border-[#373737] bg-[#1d1d1d] text-[14px] text-zinc-200">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />

                        Arc Testnet
                      </div>
                    }
                  />
                </div>

              </div>

              {/* IDENTITY */}
              <div className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#171717] p-6">

                <h3 className="text-[16px] font-semibold text-zinc-200">
                  Arivo identity
                </h3>

                <p className="mt-2 max-w-3xl text-[14px] leading-6 text-zinc-500">
                  Your Arivo ID is used to identify you across Arivo services. Your wallet address remains the underlying blockchain identity.
                </p>

              </div>

            </section>
          )}

          {/* SECURITY */}
          {activeSection ===
            "security" && (
            <section>

              <div className="mb-6">
                <h2 className="text-[22px] font-semibold lg:text-[25px]">
                  Security
                </h2>

                <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                  Protect your Arivo account and wallet.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#171717]">

                <SettingsRow
                  icon={
                    <Shield
                      size={21}
                    />
                  }
                  title="Wallet security"
                  description="Your wallet is connected and protected"
                  right={
                    <div className="flex items-center gap-2 text-[14px] text-[#22c55e]">
                      <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                      Protected
                    </div>
                  }
                />

                <div className="border-t border-[#2b2b2b]" />

                <SettingsRow
                  icon={
                    <Check
                      size={21}
                    />
                  }
                  title="Network verification"
                  description="Transactions are verified on Arc Testnet"
                  right={
                    <span className="text-[13px] text-zinc-500">
                      Active
                    </span>
                  }
                />

              </div>

            </section>
          )}

          {/* NOTIFICATIONS */}
          {activeSection ===
            "notifications" && (
            <section>

              <div className="mb-6">
                <h2 className="text-[22px] font-semibold lg:text-[25px]">
                  Notifications
                </h2>

                <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                  Choose what you want to receive.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#171717]">

                <SettingsRow
                  icon={
                    <Bell
                      size={21}
                    />
                  }
                  title="Transaction notifications"
                  description="Get notified about wallet activity"
                  right={
                    <button
                      type="button"
                      role="switch"
                      aria-checked={transactionNotifications}
                      onClick={() => {
                        const next = !transactionNotifications;
                        setTransactionNotifications(next);
                        saveNotificationSettings(
                          next,
                          paymentNotifications
                        );
                      }}
                      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                        transactionNotifications
                          ? "border-[#ddd1b9] bg-[#f1e8d5]"
                          : "border-[#3a3a3a] bg-[#242424]"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition ${
                          transactionNotifications
                            ? "left-6 bg-[#111111]"
                            : "left-1 bg-zinc-500"
                        }`}
                      />
                    </button>
                  }
                />

                <div className="border-t border-[#2b2b2b]" />

                <SettingsRow
                  icon={
                    <Bell
                      size={21}
                    />
                  }
                  title="Payment notifications"
                  description="Receive updates about incoming payments"
                  right={
                    <button
                      type="button"
                      role="switch"
                      aria-checked={paymentNotifications}
                      onClick={() => {
                        const next = !paymentNotifications;
                        setPaymentNotifications(next);
                        saveNotificationSettings(
                          transactionNotifications,
                          next
                        );
                      }}
                      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                        paymentNotifications
                          ? "border-[#ddd1b9] bg-[#f1e8d5]"
                          : "border-[#3a3a3a] bg-[#242424]"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition ${
                          paymentNotifications
                            ? "left-6 bg-[#111111]"
                            : "left-1 bg-zinc-500"
                        }`}
                      />
                    </button>
                  }
                />

              </div>

            </section>
          )}

          {/* PREFERENCES */}
          {activeSection ===
            "preferences" && (
            <section>

              <div className="mb-6">
                <h2 className="text-[22px] font-semibold lg:text-[25px]">
                  Preferences
                </h2>

                <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                  Customize your Arivo experience.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#171717]">

                <SettingsRow
                  icon={
                    <SlidersHorizontal
                      size={21}
                    />
                  }
                  title="Default asset"
                  description="Asset used by default across Arivo"
                  right={
                    <span className="text-[14px] font-medium text-zinc-200">
                      USDC
                    </span>
                  }
                />

                <div className="border-t border-[#2b2b2b]" />

                <SettingsRow
                  icon={
                    <Globe
                      size={21}
                    />
                  }
                  title="Default network"
                  description="Network used for transactions"
                  right={
                    <span className="text-[14px] font-medium text-zinc-200">
                      Arc Testnet
                    </span>
                  }
                />

              </div>

            </section>
          )}

          {/* WALLET */}
          {activeSection ===
            "wallet" && (
            <section>

              <div className="mb-6">
                <h2 className="text-[22px] font-semibold lg:text-[25px]">
                  Wallet & Network
                </h2>

                <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:max-w-none lg:text-[14px] lg:leading-normal">
                  View your connected wallet and network details.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#2d2d2d] bg-[#171717]">

                <SettingsRow
                  icon={
                    <Wallet
                      size={21}
                    />
                  }
                  title="Wallet address"
                  description="Connected wallet"
                  right={
                    <span className="text-[12px] text-zinc-300 lg:text-[14px]">
                      {shortenAddress(
                        walletAddress
                      ) ||
                        "Not connected"}
                    </span>
                  }
                />

                <div className="border-t border-[#2b2b2b]" />

                <SettingsRow
                  icon={
                    <Globe
                      size={21}
                    />
                  }
                  title="Network"
                  description="Connected blockchain network"
                  right={
                    <div className="flex items-center gap-2 text-[14px]">
                      <span className="h-2 w-2 rounded-full bg-[#22c55e]" />

                      <span className="text-zinc-200">
                        Arc Testnet
                      </span>
                    </div>
                  }
                />

                <div className="border-t border-[#2b2b2b]" />

                <SettingsRow
                  icon={
                    <Globe
                      size={21}
                    />
                  }
                  title="Chain ID"
                  description="Current network chain identifier"
                  right={
                    <span className="text-[12px] text-zinc-300 lg:text-[14px]">
                      5042002
                    </span>
                  }
                />

              </div>

            </section>
          )}

        </main>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

          <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#363636] bg-[#171717] shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#2d2d2d] px-6 py-5">

              <div>
                <h3 className="text-[19px] font-semibold">
                  Edit profile
                </h3>

                <p className="mt-1 text-[13px] text-zinc-500">
                  Update your Arivo profile.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEditProfile(
                    false
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-zinc-200"
              >
                <X
                  size={19}
                />
              </button>

            </div>

            <div className="p-6">

              {/* PICTURE */}
              <div className="flex items-center gap-4">

                {renderAvatar(
                  false
                )}

                <div>

                  <p className="text-[14px] font-medium text-zinc-200">
                    Profile picture
                  </p>

                  <p className="mt-1 text-[12px] text-zinc-500">
                    Upload an image for your Arivo profile.
                  </p>

                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={
                      handleAvatarUpload
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-3 rounded-lg border border-[#383838] bg-[#202020] px-3.5 py-2 text-[13px] font-medium text-zinc-200 transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading
                      ? "Uploading..."
                      : "Upload picture"}
                  </button>

                </div>

              </div>

              {/* NAME */}
              <div className="mt-6">

                <label className="mb-2 block text-[13px] font-medium text-zinc-400">
                  Display name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#383838] bg-[#202020] px-4 py-3 text-[14px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#555555]"
                  placeholder="Enter your name"
                />

              </div>

              {/* MESSAGE */}
              {saveMessage && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-[12px] ${
                    saveMessage.includes(
                      "successfully"
                    )
                      ? "border-green-500/20 bg-green-500/5 text-green-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  }`}
                >
                  {saveMessage}
                </div>
              )}

              {/* ACTIONS */}
              <div className="mt-7 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowEditProfile(
                      false
                    )
                  }
                  disabled={
                    saving ||
                    uploading
                  }
                  className="rounded-xl border border-[#383838] bg-[#202020] px-4 py-2.5 text-[14px] font-medium text-zinc-300 transition hover:bg-[#292929] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveProfile
                  }
                  disabled={
                    saving ||
                    uploading
                  }
                  className="rounded-xl bg-[#f1e8d5] px-5 py-2.5 text-[14px] font-semibold text-[#111111] transition hover:bg-[#e7ddc8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save changes"}
                </button>

              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}