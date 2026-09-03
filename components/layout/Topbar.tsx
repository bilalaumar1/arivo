"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bell,
  MessageCircle,
  Settings,
  Check,
  CheckCheck,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Store,
  Info,
  Menu,
} from "lucide-react";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import { getProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type NotificationType =
  | "success"
  | "send"
  | "receive"
  | "convert"
  | "merchant"
  | "info";

type ChatNotification = {
  id: string;
  title: string;
  sender_wallet?: string;
  sender_avatar?: string;
  message: string;
  timestamp: number;
  read: boolean;
};

type ArivoNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  recipient_address?: string;
  sender_address?: string;
};

// ============================================================
// STORAGE
// ============================================================

function getStorageKey(walletAddress?: string) {
  if (!walletAddress) {
    return "arivo_notifications";
  }

  return `arivo_notifications_${walletAddress.toLowerCase()}`;
}

function loadLocalNotifications(
  walletAddress?: string
): ArivoNotification[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(
      getStorageKey(walletAddress)
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error(
      "Failed to load local notifications:",
      error
    );

    return [];
  }
}

function saveLocalNotifications(
  notifications: ArivoNotification[],
  walletAddress?: string
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getStorageKey(walletAddress),
      JSON.stringify(notifications)
    );
  } catch (error) {
    console.error(
      "Failed to save local notifications:",
      error
    );
  }
}

type NotificationPreferences = {
  transactions: boolean;
  payments: boolean;
};

function getNotificationPreferences(
  walletAddress?: string
): NotificationPreferences {
  const defaults: NotificationPreferences = {
    transactions: true,
    payments: true,
  };

  if (
    typeof window === "undefined" ||
    !walletAddress
  ) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(
      `arivo:notification-settings:${walletAddress.toLowerCase()}`
    );

    if (!raw) {
      return defaults;
    }

    const saved =
      JSON.parse(raw) as Partial<NotificationPreferences>;

    return {
      transactions:
        typeof saved.transactions === "boolean"
          ? saved.transactions
          : defaults.transactions,
      payments:
        typeof saved.payments === "boolean"
          ? saved.payments
          : defaults.payments,
    };
  } catch {
    return defaults;
  }
}

function isNotificationEnabled(
  type: NotificationType,
  walletAddress?: string
) {
  const preferences =
    getNotificationPreferences(walletAddress);

  if (type === "receive") {
    return preferences.payments;
  }

  return preferences.transactions;
}

// ============================================================
// SUPABASE MAPPER
// ============================================================

function mapSupabaseNotification(
  row: any
): ArivoNotification {
  return {
    id: String(row.id),
    type:
      row.type === "success" ||
      row.type === "send" ||
      row.type === "receive" ||
      row.type === "convert" ||
      row.type === "merchant" ||
      row.type === "info"
        ? row.type
        : "info",

    title: String(
      row.title ?? "Notification"
    ),

    message: String(
      row.message ?? ""
    ),

    timestamp: row.created_at
      ? new Date(row.created_at).getTime()
      : Date.now(),

    read: Boolean(row.is_read),

    recipient_address:
      row.recipient_address ?? undefined,

    sender_address:
      row.sender_address ??
      row.sender_wallet ??
      row.from_address ??
      row.metadata?.sender_address ??
      row.metadata?.sender_wallet ??
      row.metadata?.from_address ??
      undefined,
  };
}

// ============================================================
// NOTIFICATION MESSAGE DISPLAY
// ============================================================

function formatWalletAddress(
  address?: string
) {
  if (!address) {
    return "";
  }

  const normalized = String(address).trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function formatNotificationMessage(
  message: string,
  senderAddress?: string
) {
  if (!message) {
    return "";
  }

  const senderWallet =
    formatWalletAddress(senderAddress);

  if (!senderWallet) {
    return message
      .replace(/@Arivo User/gi, "")
      .replace(/Arivo User/gi, "");
  }

  return message
    .replace(
      /@Arivo User/gi,
      `@${senderWallet}`
    )
    .replace(
      /Arivo User/gi,
      senderWallet
    );
}

// ============================================================
// NOTIFICATION ICON
// ============================================================

function NotificationIcon({
  type,
}: {
  type: NotificationType;
}) {
  if (type === "receive") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25351D] text-[#B7F35A]">
        <ArrowDownLeft
          size={18}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (type === "send") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#30291F] text-[#E6DDCD]">
        <ArrowUpRight
          size={18}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (type === "convert") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#242B35] text-[#BFD7FF]">
        <ArrowLeftRight
          size={18}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (type === "merchant") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#302B21] text-[#E6DDCD]">
        <Store
          size={18}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (type === "success") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25351D] text-[#B7F35A]">
        <Check
          size={18}
          strokeWidth={2.4}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#292929] text-[#E6DDCD]">
      <Info
        size={18}
        strokeWidth={2.2}
      />
    </div>
  );
}

// ============================================================
// TIME FORMAT
// ============================================================

function formatNotificationTime(
  timestamp: number
) {
  const now = Date.now();
  const difference = now - timestamp;

  const seconds = Math.floor(
    difference / 1000
  );

  const minutes = Math.floor(
    seconds / 60
  );

  const hours = Math.floor(
    minutes / 60
  );

  const days = Math.floor(
    hours / 24
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(
    timestamp
  ).toLocaleDateString();
}

// ============================================================
// TOPBAR
// ============================================================

export default function Topbar() {
  const { user } = usePrivy();
  const router = useRouter();

  const notificationRef =
    useRef<HTMLDivElement>(null);

  const [username, setUsername] =
    useState("");

  const [profileAvatar, setProfileAvatar] =
    useState("");

  const [notifications, setNotifications] =
    useState<ArivoNotification[]>([]);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [chatNotifications, setChatNotifications] =
    useState<ChatNotification[]>([]);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const walletAddress =
    user?.wallet?.address ?? "";

  // Google profile picture (Privy Google type does not expose `picture`
  // in its TypeScript definition, so read it safely without changing
  // the existing runtime behavior).
  const googlePicture =
    (user?.google as { picture?: string } | undefined)?.picture ||
    "";

  // ==========================================================
  // PROFILE
  // ==========================================================

  useEffect(() => {
    async function loadProfile() {
      const wallet =
        user?.wallet?.address;

      if (!wallet) {
        setUsername("");
        setProfileAvatar("");
        return;
      }

      try {
        const profile =
          await getProfile(wallet);

        if (profile) {
          setUsername(
            profile.username.replace(
              "@",
              ""
            )
          );

          setProfileAvatar(
            profile.avatar ||
            googlePicture ||
            ""
          );
        } else {
          setProfileAvatar(
            googlePicture ||
            ""
          );
        }
      } catch (error) {
        console.error(
          "Failed to load profile:",
          error
        );

        setProfileAvatar(
          googlePicture ||
          ""
        );
      }
    }

    loadProfile();
  }, [user]);

  // ==========================================================
  // LOAD NOTIFICATIONS FROM SUPABASE
  // ==========================================================

  useEffect(() => {
    if (!walletAddress) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select("*")
          .eq(
            "recipient_address",
            walletAddress.toLowerCase()
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(50);

        if (error) {
          console.error(
            "Failed to load Supabase notifications:",
            error
          );

          if (!cancelled) {
            setNotifications(
              loadLocalNotifications(
                walletAddress
              )
            );
          }

          return;
        }

        const mapped =
          (data ?? [])
            .map(mapSupabaseNotification)
            .filter((notification) =>
              isNotificationEnabled(
                notification.type,
                walletAddress
              )
            );

        if (!cancelled) {
          setNotifications(mapped);

          saveLocalNotifications(
            mapped,
            walletAddress
          );
        }
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );

        if (!cancelled) {
          setNotifications(
            loadLocalNotifications(
              walletAddress
            )
          );
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // ==========================================================
  // REALTIME NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    const normalizedWallet =
      walletAddress.toLowerCase();

    const channel =
      supabase
        .channel(
          `arivo-notifications-${normalizedWallet}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_address=eq.${normalizedWallet}`,
          },
          (payload) => {
            const newNotification =
              mapSupabaseNotification(
                payload.new
              );

            if (
              !isNotificationEnabled(
                newNotification.type,
                walletAddress
              )
            ) {
              return;
            }

            setNotifications(
              (current) => {
                const alreadyExists =
                  current.some(
                    (item) =>
                      item.id ===
                      newNotification.id
                  );

                if (alreadyExists) {
                  return current;
                }

                const updated = [
                  newNotification,
                  ...current,
                ].slice(0, 50);

                saveLocalNotifications(
                  updated,
                  walletAddress
                );

                return updated;
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `recipient_address=eq.${normalizedWallet}`,
          },
          (payload) => {
            const updatedNotification =
              mapSupabaseNotification(
                payload.new
              );

            setNotifications(
              (current) => {
                const updated =
                  isNotificationEnabled(
                    updatedNotification.type,
                    walletAddress
                  )
                    ? current.map(
                        (item) =>
                          item.id ===
                          updatedNotification.id
                            ? updatedNotification
                            : item
                      )
                    : current.filter(
                        (item) =>
                          item.id !==
                          updatedNotification.id
                      );

                saveLocalNotifications(
                  updated,
                  walletAddress
                );

                return updated;
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            const deletedId =
              String(
                payload.old?.id ?? ""
              );

            if (!deletedId) {
              return;
            }

            setNotifications(
              (current) => {
                const updated =
                  current.filter(
                    (item) =>
                      item.id !== deletedId
                  );

                saveLocalNotifications(
                  updated,
                  walletAddress
                );

                return updated;
              }
            );
          }
        )
        .subscribe((status) => {
          console.log(
            "Arivo notifications realtime:",
            status
          );
        });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress]);

  // ==========================================================
  // REALTIME CHAT NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    if (!walletAddress) {
      setChatNotifications([]);
      return;
    }

    const normalizedWallet =
      walletAddress.toLowerCase();

    let cancelled = false;

    function fallbackSenderName(
      senderWallet?: string
    ) {
      const normalized =
        String(senderWallet ?? "").trim();

      if (!normalized) {
        return "Unknown sender";
      }

      if (normalized.length <= 12) {
        return normalized;
      }

      return `${normalized.slice(
        0,
        6
      )}...${normalized.slice(-4)}`;
    }

    async function resolveSenderProfile(
      senderWallet?: string
    ): Promise<{
      username: string;
      avatar: string;
    }> {
      const wallet =
        String(senderWallet ?? "").trim();

      if (!wallet) {
        return {
          username: "Unknown sender",
          avatar: "",
        };
      }

      try {
        /*
         * Get the real sender profile.
         * profiles uses `avatar` for the profile picture.
         * ilike keeps this working with mixed-case wallet addresses.
         */
        const { data, error } =
          await supabase
            .from("profiles")
            .select("username, avatar")
            .ilike("wallet", wallet)
            .limit(1)
            .maybeSingle();

        if (!error && data) {
          const senderUsername =
            data.username
              ? String(data.username)
                  .replace(/^@/, "")
                  .trim()
              : "";

          const senderAvatar =
            data.avatar
              ? String(data.avatar).trim()
              : "";

          return {
            username:
              senderUsername ||
              fallbackSenderName(
                wallet
              ),
            avatar: senderAvatar,
          };
        }
      } catch (error) {
        console.error(
          "Failed to load sender profile:",
          error
        );
      }

      return {
        username:
          fallbackSenderName(
            wallet
          ),
        avatar: "",
      };
    }

    async function buildChatNotification(
      row: any
    ): Promise<ChatNotification> {
      const senderWallet =
        String(
          row.sender_wallet ?? ""
        ).trim();

      const senderProfile =
        await resolveSenderProfile(
          senderWallet
        );

      return {
        id: String(row.id),
        title:
          senderProfile.username,
        sender_wallet:
          senderWallet || undefined,
        sender_avatar:
          senderProfile.avatar ||
          undefined,
        message: String(
          row.body_text ??
            "New message"
        ),
        timestamp: row.created_at
          ? new Date(
              row.created_at
            ).getTime()
          : Date.now(),
        read: false,
      };
    }

    async function loadChatNotifications() {
      try {
        const { data, error } =
          await supabase
            .from("chat_messages")
            .select(
              "id, sender_wallet, body_text, created_at"
            )
            .eq(
              "receiver_wallet",
              normalizedWallet
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(50);

        if (error) {
          /*
           * Do not log this as console.error in development.
           * Next.js/Turbopack treats console.error as a runtime
           * overlay, which was covering the whole dashboard.
           * Keep the existing notification UI alive instead.
           */
          if (!cancelled) {
            setChatNotifications([]);
          }
          return;
        }

        const enriched =
          await Promise.all(
            (data ?? []).map(
              (row: any) =>
                buildChatNotification(
                  row
                )
            )
          );

        if (
          !cancelled
        ) {
          setChatNotifications(
            enriched
          );
        }
      } catch {
        /*
         * A temporary load failure must not break the dashboard
         * or open the Next.js error overlay.
         */
        if (!cancelled) {
          setChatNotifications([]);
        }
      }
    }

    void loadChatNotifications();

    const channel =
      supabase
        .channel(
          `arivo-chat-notifications-${normalizedWallet}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `receiver_wallet=eq.${normalizedWallet}`,
          },
          async (payload) => {
            const row =
              payload.new as any;

            const newChatNotification =
              await buildChatNotification(
                row
              );

            if (cancelled) {
              return;
            }

            setChatNotifications(
              (current) => {
                if (
                  current.some(
                    (item) =>
                      item.id ===
                      newChatNotification.id
                  )
                ) {
                  return current;
                }

                return [
                  newChatNotification,
                  ...current,
                ].slice(0, 50);
              }
            );
          }
        )
        .subscribe((status) => {
          console.log(
            "Arivo chat notifications realtime:",
            status
          );
        });

    return () => {
      cancelled = true;
      void supabase.removeChannel(
        channel
      );
    };
  }, [walletAddress]);

  // ==========================================================
  // LOCAL APP NOTIFICATION EVENT
  // ==========================================================

  useEffect(() => {
    function handleNotification(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          type?: NotificationType;
          title: string;
          message: string;
          senderAddress?: string;
        }>;

      const detail =
        customEvent.detail;

      if (!detail?.title) {
        return;
      }

      const notificationType =
        detail.type || "info";

      if (
        !isNotificationEnabled(
          notificationType,
          walletAddress
        )
      ) {
        return;
      }

      const newNotification: ArivoNotification =
        {
          id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,

          type: notificationType,

          title: detail.title,

          message:
            detail.message || "",

          timestamp: Date.now(),

          read: false,

          recipient_address:
            walletAddress.toLowerCase(),

          sender_address:
            detail.senderAddress ??
            undefined,
        };

      setNotifications(
        (current) => {
          const updated = [
            newNotification,
            ...current,
          ].slice(0, 50);

          saveLocalNotifications(
            updated,
            walletAddress
          );

          return updated;
        }
      );
    }

    window.addEventListener(
      "arivo:notification",
      handleNotification
    );

    return () => {
      window.removeEventListener(
        "arivo:notification",
        handleNotification
      );
    };
  }, [walletAddress]);

  // ==========================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // ==========================================================

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [notificationsOpen]);

  // ==========================================================
  // OPEN CHAT
  // ==========================================================

  function openMessages() {
    setChatOpen((current) => !current);
  }

  function openChatNotification(id: string) {
    setChatNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, read: true }
          : item
      )
    );

    setChatOpen(false);
    router.push("/chat");
  }

  function openArivoChat() {
    setChatOpen(false);
    router.push("/chat");
  }

  // ==========================================================
  // USER NAME
  // ==========================================================

  const userName =
    username ||
    user?.google?.name ||
    (user?.wallet?.address
      ? `${user.wallet.address.slice(
          0,
          6
        )}...${user.wallet.address.slice(-4)}`
      : "User");

  // ==========================================================
  // GREETING
  // ==========================================================

  const hour =
    new Date().getHours();

  let greeting =
    "Good evening";

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (
    hour >= 12 &&
    hour < 18
  ) {
    greeting = "Good afternoon";
  }

  // ==========================================================
  // CHAT UNREAD COUNT
  // ==========================================================

  const chatUnreadCount =
    chatNotifications.filter(
      (notification) =>
        !notification.read
    ).length;

  // ==========================================================
  // UNREAD COUNT
  // ==========================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  // ==========================================================
  // MARK ONE AS READ
  // ==========================================================

  async function markAsRead(
    id: string
  ) {
    setNotifications(
      (current) => {
        const updated =
          current.map(
            (notification) =>
              notification.id === id
                ? {
                    ...notification,
                    read: true,
                  }
                : notification
          );

        saveLocalNotifications(
          updated,
          walletAddress
        );

        return updated;
      }
    );

    try {
      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("id", id)
          .eq(
            "recipient_address",
            walletAddress.toLowerCase()
          );

      if (error) {
        console.error(
          "Failed to mark notification as read:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  }

  // ==========================================================
  // MARK ALL AS READ
  // ==========================================================

  async function markAllAsRead() {
    setNotifications(
      (current) => {
        const updated =
          current.map(
            (notification) => ({
              ...notification,
              read: true,
            })
          );

        saveLocalNotifications(
          updated,
          walletAddress
        );

        return updated;
      }
    );

    if (!walletAddress) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "recipient_address",
            walletAddress.toLowerCase()
          )
          .eq("is_read", false);

      if (error) {
        console.error(
          "Failed to mark all notifications as read:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  }

  // ==========================================================
  // DELETE ONE
  // ==========================================================

  async function deleteNotification(
    id: string
  ) {
    setNotifications(
      (current) => {
        const updated =
          current.filter(
            (notification) =>
              notification.id !== id
          );

        saveLocalNotifications(
          updated,
          walletAddress
        );

        return updated;
      }
    );

    try {
      const { error } =
        await supabase
          .from("notifications")
          .delete()
          .eq("id", id)
          .eq(
            "recipient_address",
            walletAddress.toLowerCase()
          );

      if (error) {
        console.error(
          "Failed to delete notification:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete notification:",
        error
      );
    }
  }

  // ==========================================================
  // CLEAR ALL
  // ==========================================================

  async function clearAllNotifications() {
    setNotifications([]);

    saveLocalNotifications(
      [],
      walletAddress
    );

    if (!walletAddress) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("notifications")
          .delete()
          .eq(
            "recipient_address",
            walletAddress.toLowerCase()
          );

      if (error) {
        console.error(
          "Failed to clear notifications:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Failed to clear notifications:",
        error
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <header className="relative flex min-h-[88px] w-full items-start justify-between gap-3 border-b border-[#2b2b2b] bg-[#111111] px-5 py-4 lg:h-[76px] lg:min-h-0 lg:items-center lg:gap-0 lg:px-7 lg:py-0">

      {/* ====================================================
          LEFT
      ==================================================== */}

      <div className="min-w-0 flex-1">
        {/* Mobile brand row */}
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efe5d2]">
            <img
              src="/arivo-icon-black.png"
              alt="Arivo"
              className="h-7 w-7 object-contain"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(true);
              window.dispatchEvent(
                new CustomEvent("arivo:open-mobile-sidebar")
              );
            }}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] text-zinc-300 transition hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-white md:text-[24px] lg:text-[24px]">
            {greeting}, {userName} 👋
          </h1>

          <p className="hidden lg:block mt-2 max-w-[280px] text-[13px] leading-5 text-zinc-500 lg:mt-1 lg:max-w-none lg:leading-normal">
  Here's what's happening with your account today.
</p>
        </div>

        {/* Mobile profile avatar */}
        <div className="pointer-events-none absolute right-5 top-[70px] z-10 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#2b2b2b] bg-[#1a1a1a] lg:hidden">
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={`${userName} avatar`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#efe5d2] text-[18px] font-bold text-black">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          RIGHT
      ==================================================== */}

      <div className="flex shrink-0 items-center gap-2 md:gap-3">

        {/* ==================================================
            MESSAGES
        ================================================== */}

        <div className="relative">
          <button
            type="button"
            onClick={openMessages}
            aria-label="Messages"
            aria-expanded={chatOpen}
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 ${
              chatOpen
                ? "border-[#4a4a4a] bg-[#232323] text-white"
                : "border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
            }`}
          >
            <MessageCircle
              size={18}
              strokeWidth={2}
            />

            {chatUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#111111] bg-[#E6DDCD] px-1 text-[9px] font-bold text-black">
                {chatUnreadCount > 99
                  ? "99+"
                  : chatUnreadCount}
              </span>
            ) : null}
          </button>

          {chatOpen ? (
            <div className="fixed left-3 right-3 top-[104px] z-[9999] w-auto max-w-none overflow-hidden rounded-2xl border border-[#303030] bg-[#181818] shadow-[0_24px_70px_rgba(0,0,0,0.55)] lg:absolute lg:left-auto lg:right-0 lg:top-[56px] lg:w-[390px] lg:max-w-[390px]">
              <div className="flex items-center justify-between border-b border-[#2b2b2b] px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-white">
                    Messages
                  </h2>
                  <p className="mt-1 text-[12px] text-zinc-500">
                    {chatUnreadCount > 0
                      ? `${chatUnreadCount} unread`
                      : "You're all caught up"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  title="Close"
                  aria-label="Close messages"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {chatNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#232323] text-zinc-500">
                      <MessageCircle size={20} />
                    </div>

                    <p className="mt-4 text-sm font-medium text-white">
                      No messages
                    </p>

                    <p className="mt-1 max-w-[240px] text-xs leading-5 text-zinc-500">
                      New chats will appear here.
                    </p>
                  </div>
                ) : (
                  chatNotifications.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() =>
                        openChatNotification(chat.id)
                      }
                      className={`flex w-full items-start gap-3 border-b border-[#252525] px-4 py-4 text-left transition hover:bg-[#222222] ${
                        chat.read
                          ? "bg-[#181818]"
                          : "bg-[#1d1d1d]"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#242B35] text-[#BFD7FF]">
                        {chat.sender_avatar ? (
                          <img
                            src={chat.sender_avatar}
                            alt={`${chat.title} avatar`}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <span className="text-[14px] font-semibold text-[#D9E7FF]">
                            {chat.title
                              .trim()
                              .charAt(0)
                              .toUpperCase() || (
                              <MessageCircle
                                size={18}
                                strokeWidth={2.2}
                              />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] leading-5 ${
                            chat.read
                              ? "font-medium text-zinc-300"
                              : "font-semibold text-white"
                          }`}>
                            {chat.title}
                          </p>

                          {!chat.read ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E6DDCD]" />
                          ) : null}
                        </div>

                        <p className="mt-1 truncate text-[12px] text-zinc-500">
                          {chat.message}
                        </p>

                        <p className="mt-2 text-[10px] text-zinc-600">
                          {formatNotificationTime(
                            chat.timestamp
                          )}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-[#2b2b2b] px-4 py-3">
                <button
                  type="button"
                  onClick={openArivoChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-medium text-zinc-300 transition hover:bg-[#232323] hover:text-white"
                >
                  Open Arivo Chat
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ==================================================
            NOTIFICATIONS
        ================================================== */}

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) => !current
              )
            }
            aria-label="Notifications"
            aria-expanded={
              notificationsOpen
            }
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 ${
              notificationsOpen
                ? "border-[#4a4a4a] bg-[#232323] text-white"
                : "border-[#2b2b2b] bg-[#1a1a1a] text-zinc-400 hover:border-[#3a3a3a] hover:bg-[#232323] hover:text-white"
            }`}
          >
            <Bell
              size={18}
              strokeWidth={2}
            />

            {/* UNREAD BADGE */}

            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#111111] bg-[#E6DDCD] px-1 text-[9px] font-bold text-black">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            ) : null}
          </button>

          {/* =================================================
              NOTIFICATION PANEL
          ================================================= */}

          {notificationsOpen ? (
            <div className="fixed left-3 right-3 top-[104px] z-[9999] w-auto max-w-none overflow-hidden rounded-2xl border border-[#303030] bg-[#181818] shadow-[0_24px_70px_rgba(0,0,0,0.55)] lg:absolute lg:left-auto lg:right-0 lg:top-[56px] lg:w-[390px] lg:max-w-[390px]">

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-[#2b2b2b] px-5 py-4">

                <div>
                  <h2 className="text-[15px] font-semibold text-white">
                    Notifications
                  </h2>

                  <p className="mt-1 text-[12px] text-zinc-500">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : "You're all caught up"}
                  </p>
                </div>

                <div className="flex items-center gap-1">

                  {/* MARK ALL AS READ */}

                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={
                        markAllAsRead
                      }
                      title="Mark all as read"
                      aria-label="Mark all as read"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-white"
                    >
                      <CheckCheck
                        size={16}
                      />
                    </button>
                  ) : null}

                  {/* CLOSE PANEL */}

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(
                        false
                      )
                    }
                    title="Close"
                    aria-label="Close notifications"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-[#252525] hover:text-white"
                  >
                    <X
                      size={16}
                    />
                  </button>

                </div>
              </div>

              {/* BODY */}

              <div className="max-h-[430px] overflow-y-auto">

                {notifications.length ===
                0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#232323] text-zinc-500">
                      <Bell
                        size={20}
                      />
                    </div>

                    <p className="mt-4 text-sm font-medium text-white">
                      No notifications
                    </p>

                    <p className="mt-1 max-w-[240px] text-xs leading-5 text-zinc-500">
                      Important activity from
                      your account will appear
                      here.
                    </p>

                  </div>
                ) : (
                  notifications.map(
                    (notification) => (
                      <div
                        key={
                          notification.id
                        }
                        className={`group relative border-b border-[#252525] px-4 py-4 transition ${
                          notification.read
                            ? "bg-[#181818]"
                            : "bg-[#1d1d1d]"
                        } hover:bg-[#222222]`}
                      >

                        <div className="flex gap-3">

                          <NotificationIcon
                            type={
                              notification.type
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                            className="min-w-0 flex-1 text-left"
                          >

                            <div className="flex items-start justify-between gap-2">

                              <p
                                className={`text-[13px] leading-5 ${
                                  notification.read
                                    ? "font-medium text-zinc-300"
                                    : "font-semibold text-white"
                                }`}
                              >
                                {
                                  notification.title
                                }
                              </p>

                              {!notification.read ? (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E6DDCD]" />
                              ) : null}

                            </div>

                            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                              {formatNotificationMessage(
                                notification.message,
                                notification.sender_address
                              )}
                            </p>

                            <p className="mt-2 text-[10px] text-zinc-600">
                              {formatNotificationTime(
                                notification.timestamp
                              )}
                            </p>

                          </button>

                          {/* DELETE ONE */}

                          <button
                            type="button"
                            onClick={() =>
                              deleteNotification(
                                notification.id
                              )
                            }
                            aria-label="Delete notification"
                            className="absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-md text-zinc-600 transition hover:bg-[#2b2b2b] hover:text-white group-hover:flex"
                          >
                            <X
                              size={13}
                            />
                          </button>

                        </div>
                      </div>
                    )
                  )
                )}

              </div>

              {/* FOOTER */}

              {notifications.length >
              0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#2b2b2b] px-4 py-3">

                  {/* MARK ALL AS READ */}

                  <button
                    type="button"
                    onClick={
                      markAllAsRead
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-[#232323] hover:text-white"
                  >
                    <Check
                      size={14}
                    />

                    Mark all as read
                  </button>

                  {/* CLEAR ALL */}

                  <button
                    type="button"
                    onClick={
                      clearAllNotifications
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-[#2a2020] hover:text-white"
                  >
                    <X
                      size={14}
                    />

                    Clear all
                  </button>

                </div>
              ) : null}

            </div>
          ) : null}
        </div>

        {/* ==================================================
            SETTINGS
        ================================================== */}

        <button
          type="button"
          aria-label="Settings"
          onClick={() =>
            router.push("/settings")
          }
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