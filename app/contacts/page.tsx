"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  MoreHorizontal,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

import Sidebar from "@/components/layout/Sidebar";

import {
  getProfile,
  getProfileByArivoId,
} from "@/lib/profile";

import {
  ArivoContact,
  createContact,
  deleteContact,
  getContacts,
  toggleContactFavorite,
} from "@/lib/contacts";

function shortAddress(address: string) {
  if (address.length <= 18) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function initials(name: string) {
  const value = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return value || "A";
}

function isValidWalletAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function cleanUsername(username: string) {
  return username.replace(/^@/, "").trim();
}

function ContactAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 text-[11px]"
      : "h-11 w-11 text-xs";

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} avatar`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${sizeClass} shrink-0 rounded-2xl border border-[#303030] bg-[#202020] object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#303030] bg-[#202020] font-semibold text-zinc-300`}
    >
      {initials(name)}
    </div>
  );
}

export default function ContactsPage() {
  const { user, ready, authenticated } = usePrivy();
  const { t } = useI18n();

  const walletAddress = user?.wallet?.address ?? "";

  const [contacts, setContacts] = useState<ArivoContact[]>([]);

  const [savedQuery, setSavedQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [arivoSearch, setArivoSearch] = useState("");

  const [arivoUser, setArivoUser] = useState<{
    username: string;
    avatar: string;
    wallet: string;
    arivo_id: string;
  } | null>(null);

  const [searchingArivo, setSearchingArivo] = useState(false);
  const [arivoError, setArivoError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualNote, setManualNote] = useState("");

  const [menuId, setMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  /*
   * --------------------------------------------------
   * SYNC CONTACT PROFILES
   *
   * Contacts are stored locally for convenience,
   * but Arivo username/avatar always come from
   * the real Supabase profile.
   * --------------------------------------------------
   */
  async function syncContactProfiles(
    sourceContacts: ArivoContact[]
  ) {
    if (!sourceContacts.length) {
      return sourceContacts;
    }

    const synced = await Promise.all(
      sourceContacts.map(async (contact) => {
        try {
          const profile = contact.arivoId
            ? await getProfileByArivoId(contact.arivoId)
            : await getProfile(contact.walletAddress);

          if (!profile) {
            return contact;
          }

          return {
            ...contact,

            /*
             * IMPORTANT:
             * Always use the CURRENT username.
             */
            name: cleanUsername(profile.username),

            /*
             * IMPORTANT:
             * Always use the CURRENT avatar.
             */
            avatarUrl: profile.avatar ?? "",

            /*
             * Keep the real Arivo ID.
             */
            arivoId:
              profile.arivo_id ||
              contact.arivoId ||
              "",
          };
        } catch (error) {
          console.error(
            "Failed to sync Arivo profile:",
            contact.walletAddress,
            error
          );

          return contact;
        }
      })
    );

    return synced;
  }

  /*
   * --------------------------------------------------
   * LOAD + AUTO REFRESH CONTACTS
   * --------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      if (!walletAddress) {
        setContacts([]);
        return;
      }

      const savedContacts = getContacts(walletAddress);

      /*
       * Show local contacts immediately.
       */
      setContacts(savedContacts);

      /*
       * Immediately sync from Supabase.
       */
      const synced = await syncContactProfiles(savedContacts);

      if (cancelled) return;

      setContacts(synced);

      try {
        window.localStorage.setItem(
          `arivo:contacts:${walletAddress.toLowerCase()}`,
          JSON.stringify(synced)
        );
      } catch (error) {
        console.error(
          "Failed to save synced contacts:",
          error
        );
      }
    }

    void loadContacts();

    /*
     * --------------------------------------------------
     * AUTO REFRESH
     *
     * Every 3 seconds we ask Supabase for the latest
     * username/avatar of every saved contact.
     *
     * This means:
     *
     * User A changes profile
     *        ↓
     * Supabase profile changes
     *        ↓
     * User B refreshes automatically
     *        ↓
     * New username/avatar appears
     * --------------------------------------------------
     */
    const interval = window.setInterval(() => {
      if (!walletAddress || cancelled) return;

      void (async () => {
        const currentContacts = getContacts(walletAddress);

        const synced = await syncContactProfiles(
          currentContacts
        );

        if (cancelled) return;

        setContacts((current) => {
          const currentJson = JSON.stringify(current);
          const syncedJson = JSON.stringify(synced);

          if (currentJson === syncedJson) {
            return current;
          }

          return synced;
        });

        try {
          window.localStorage.setItem(
            `arivo:contacts:${walletAddress.toLowerCase()}`,
            JSON.stringify(synced)
          );
        } catch (error) {
          console.error(
            "Failed to persist synced contacts:",
            error
          );
        }
      })();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [walletAddress]);

  const filteredContacts = useMemo(() => {
    const q = savedQuery.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesSearch =
        !q ||
        contact.name.toLowerCase().includes(q) ||
        contact.walletAddress.toLowerCase().includes(q) ||
        contact.arivoId?.toLowerCase().includes(q) ||
        contact.note.toLowerCase().includes(q);

      return (
        matchesSearch &&
        (!favoritesOnly || contact.favorite)
      );
    });
  }, [contacts, favoritesOnly, savedQuery]);

  function closeModal() {
    setModalOpen(false);
    setManualName("");
    setManualAddress("");
    setManualNote("");
    setError("");
  }

  async function handleArivoSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const id = arivoSearch.trim().toUpperCase();

    setArivoError("");
    setArivoUser(null);

    if (!id) {
      setArivoError(t("common", "enterArivoId"));
      return;
    }

    try {
      setSearchingArivo(true);

      const profile = await getProfileByArivoId(id);

      if (!profile) {
        setArivoError(
          t("common", "noArivoUserFound")
        );
        return;
      }

      if (!profile.wallet) {
        setArivoError(
          t("common", "arivoUserNoWallet")
        );
        return;
      }

      setArivoUser({
        username: cleanUsername(profile.username),
        avatar: profile.avatar ?? "",
        wallet: profile.wallet,
        arivo_id: profile.arivo_id ?? id,
      });
    } catch (err) {
      console.error(err);

      setArivoError(
        t("common", "searchFailed")
      );
    } finally {
      setSearchingArivo(false);
    }
  }

  function saveArivoUser() {
    if (!walletAddress || !arivoUser) {
      setError(
        t("common", "connectWalletFirst")
      );
      return;
    }

    const exists = contacts.some(
      (contact) =>
        contact.walletAddress.toLowerCase() ===
        arivoUser.wallet.toLowerCase()
    );

    if (exists) {
      setError(
        t("common", "recipientAlreadySaved")
      );
      return;
    }

    try {
      const created = createContact(
        walletAddress,
        {
          name: arivoUser.username,
          walletAddress: arivoUser.wallet,
          note: `Arivo user · ${arivoUser.arivo_id}`,
          arivoId: arivoUser.arivo_id,
          avatarUrl: arivoUser.avatar,
        }
      );

      setContacts((current) => [
        created,
        ...current,
      ]);

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t("common", "unableToSaveContact")
      );
    }
  }

  function handleManualCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!walletAddress) {
      setError(
        t("common", "connectWalletFirst")
      );
      return;
    }

    if (
      !manualName.trim() ||
      !manualAddress.trim()
    ) {
      setError(
        t("common", "completeContactDetails")
      );
      return;
    }

    if (!isValidWalletAddress(manualAddress)) {
      setError(
        t("common", "invalidWalletAddress")
      );
      return;
    }

    try {
      const created = createContact(
        walletAddress,
        {
          name: manualName,
          walletAddress: manualAddress,
          note: manualNote,
          arivoId: "",
          avatarUrl: "",
        }
      );

      setContacts((current) => [
        created,
        ...current,
      ]);

      closeModal();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t("common", "unableToSaveContact")
      );
    }
  }

  function handleFavorite(
    contact: ArivoContact
  ) {
    if (!walletAddress) return;

    const next = toggleContactFavorite(
      walletAddress,
      contact.id
    );

    setContacts(next);
    setMenuId(null);
  }

  function handleDelete(id: string) {
    if (!walletAddress) return;

    const next = deleteContact(
      walletAddress,
      id
    );

    setContacts(next);
    setMenuId(null);
  }

  async function handleCopy(
    contact: ArivoContact
  ) {
    try {
      await navigator.clipboard.writeText(
        contact.walletAddress
      );

      setCopiedId(contact.id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === contact.id
            ? null
            : current
        );
      }, 1400);
    } catch (err) {
      console.error(err);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen bg-[#111111] text-white">
        <Sidebar />

        <main className="flex min-h-screen min-w-0 flex-1 items-center justify-center">
          <p className="text-sm text-zinc-500">
            {t("common", "loadingAccount")}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="w-full px-6 py-0 lg:px-8">

          <header className="flex min-h-[88px] items-center justify-between border-b border-[#292929]">
            <div className="flex items-center gap-4">

              <button
                type="button"
                onClick={() =>
                  window.history.back()
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#303030] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525] hover:text-white"
                aria-label={t("common", "back")}
              >
                <ArrowLeft size={19} />
              </button>

              <div>
                <h1 className="text-[26px] font-semibold">
                  {t("common", "contacts")}
                </h1>

                <p className="mt-1 text-[13px] text-zinc-500">
                  {t("common",
                    "contactsPageDescription")}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setModalOpen(true)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--arivo-primary)] px-4 text-[12px] font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)]"
            >
              <Plus size={16} />
              {t("common", "addContact")}
            </button>
          </header>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          <section className="mt-7 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5">
              <p className="text-[10px] font-medium tracking-[0.16em] text-zinc-500">
                {t("common", "savedContacts").toUpperCase()}
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {contacts.length}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {t("common", "reusableRecipients")}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5">
              <p className="text-[10px] font-medium tracking-[0.16em] text-zinc-500">
                {t("common", "arivoLookup").toUpperCase()}
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {t("common", "onDemand")}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {t("common", "searchWhenNeeded")}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2b2b2b] bg-[#202020] p-5">
              <p className="text-[10px] font-medium tracking-[0.16em] text-zinc-500">
                {t("common", "favorites").toUpperCase()}
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {
                  contacts.filter(
                    (contact) =>
                      contact.favorite
                  ).length
                }
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {t("common", "frequentRecipients")}
              </p>
            </div>

          </section>

          <section className="mt-5 overflow-hidden rounded-[24px] border border-[#2b2b2b] bg-[#191919]">

            <div className="flex flex-col gap-4 border-b border-[#2b2b2b] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <UserRound
                    size={17}
                    className="text-zinc-500"
                  />

                  <h2 className="text-[15px] font-semibold">
                    {t("common", "findSomeoneOnArivo")}
                  </h2>
                </div>

                <p className="mt-1 text-[11px] text-zinc-600">
                  {t("common",
                    "arivoSearchDescription"
                  )}
                </p>
              </div>

              <form
                onSubmit={handleArivoSearch}
                className="flex w-full gap-2 lg:w-[430px]"
              >
                <input
                  value={arivoSearch}
                  onChange={(event) =>
                    setArivoSearch(
                      event.target.value
                    )
                  }
                  placeholder="ARV-XXXX-XXXX"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#303030] bg-[#202020] px-3 font-mono text-xs text-white outline-none placeholder:text-zinc-700 focus:border-[#4b4b4b]"
                />

                <button
                  type="submit"
                  disabled={searchingArivo}
                  className="h-11 shrink-0 rounded-xl bg-[var(--arivo-primary)] px-4 text-xs font-semibold text-black disabled:opacity-60"
                >
                  {searchingArivo
                    ? t("common", "searching")
                    : t("common", "search")}
                </button>
              </form>

            </div>

            {arivoError ? (
              <div className="border-b border-[#2b2b2b] px-5 py-3 text-xs text-red-300">
                {arivoError}
              </div>
            ) : null}

            {arivoUser ? (
              <div className="p-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-[#303030] bg-[#1d1d1d] p-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex min-w-0 items-center gap-3">

                    <ContactAvatar
                      name={arivoUser.username}
                      avatarUrl={arivoUser.avatar}
                    />

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <p className="truncate text-sm font-semibold">
                          {arivoUser.username}
                        </p>

                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                          ARIVO
                        </span>

                      </div>

                      <p className="mt-1 font-mono text-[11px] text-zinc-600">
                        {arivoUser.arivo_id} ·{" "}
                        {shortAddress(
                          arivoUser.wallet
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">

                    <Link
                      href={`/send?address=${encodeURIComponent(
                        arivoUser.wallet
                      )}&arivo=${encodeURIComponent(
                        arivoUser.arivo_id
                      )}`}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#303030] bg-[#202020] px-4 text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                    >
                      <Send size={15} />
                      {t("common", "send")}
                    </Link>

                    <button
                      type="button"
                      onClick={saveArivoUser}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--arivo-primary)] px-4 text-xs font-semibold text-black"
                    >
                      <Plus size={15} />
                      {t("common", "saveContact")}
                    </button>

                  </div>

                </div>
              </div>
            ) : null}

          </section>

          <section className="mt-5 overflow-visible rounded-[24px] border border-[#2b2b2b] bg-[#181818]">

            <div className="flex flex-col gap-3 border-b border-[#2b2b2b] p-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="relative min-w-0 flex-1">

                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <input
                  value={savedQuery}
                  onChange={(event) =>
                    setSavedQuery(
                      event.target.value
                    )
                  }
                  placeholder={t("common", "searchSavedPlaceholder")}
                  className="h-11 w-full rounded-xl border border-[#2b2b2b] bg-[#202020] pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#454545]"
                />

              </div>

              <div className="flex rounded-xl border border-[#2b2b2b] bg-[#202020] p-1">

                <button
                  type="button"
                  onClick={() =>
                    setFavoritesOnly(false)
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    !favoritesOnly
                      ? "bg-[var(--arivo-primary)] text-black"
                      : "text-zinc-500"
                  }`}
                >
                  {t("common", "all")}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFavoritesOnly(true)
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    favoritesOnly
                      ? "bg-[var(--arivo-primary)] text-black"
                      : "text-zinc-500"
                  }`}
                >
                  {t("common", "favorites")}
                </button>

              </div>

            </div>

            {filteredContacts.length ? (
              <div className="divide-y divide-[#2b2b2b]">

                {filteredContacts.map(
                  (contact) => (
                    <article
                      key={contact.id}
                      className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex min-w-0 items-center gap-4">

                        <ContactAvatar
                          name={contact.name}
                          avatarUrl={
                            contact.avatarUrl
                          }
                        />

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <h2 className="truncate text-sm font-semibold">
                              {contact.name}
                            </h2>

                            {contact.arivoId ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                                ARIVO
                              </span>
                            ) : null}

                            {contact.favorite ? (
                              <Star
                                size={14}
                                fill="currentColor"
                                className="shrink-0 text-[var(--arivo-primary)]"
                              />
                            ) : null}

                          </div>

                          <p className="mt-1 truncate font-mono text-[11px] text-zinc-600">
                            {contact.arivoId
                              ? `${contact.arivoId} · `
                              : ""}
                            {shortAddress(
                              contact.walletAddress
                            )}
                          </p>

                          {contact.note ? (
                            <p className="mt-1 truncate text-xs text-zinc-500">
                              {contact.note}
                            </p>
                          ) : null}

                        </div>

                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">

                        <button
                          type="button"
                          onClick={() =>
                            void handleCopy(
                              contact
                            )
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#303030] bg-[#202020] px-3 text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                        >
                          {copiedId ===
                          contact.id ? (
                            <Check size={15} />
                          ) : (
                            <Copy size={15} />
                          )}

                          {copiedId ===
                          contact.id
                            ? t("common", "copied")
                            : t("common", "copy")}
                        </button>

                        <Link
                          href={`/send?address=${encodeURIComponent(
                            contact.walletAddress
                          )}${
                            contact.arivoId
                              ? `&arivo=${encodeURIComponent(
                                  contact.arivoId
                                )}`
                              : ""
                          }`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--arivo-primary)] px-3 text-xs font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)]"
                        >
                          <Send size={15} />
                          {t("common", "send")}
                        </Link>

                        <div className="relative">

                          <button
                            type="button"
                            onClick={() =>
                              setMenuId(
                                (current) =>
                                  current ===
                                  contact.id
                                    ? null
                                    : contact.id
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#303030] bg-[#202020] text-zinc-500 hover:bg-[#282828] hover:text-white"
                            aria-label={`${t("common", "moreOptionsFor")} ${contact.name}`}
                          >
                            <MoreHorizontal
                              size={17}
                            />
                          </button>

                          {menuId ===
                          contact.id ? (
                            <div className="absolute bottom-12 right-0 z-[100] w-52 rounded-2xl border border-[#343434] bg-[#1b1b1b] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">

                              <button
                                type="button"
                                onClick={() =>
                                  handleFavorite(
                                    contact
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                              >
                                <Star
                                  size={15}
                                  fill={
                                    contact.favorite
                                      ? "currentColor"
                                      : "none"
                                  }
                                />

                                {contact.favorite
                                  ? t("common", "removeFromFavorites")
                                  : t("common", "addToFavorites")}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopy(
                                    contact
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                              >
                                <Copy size={15} />
                                {t("common", "copyWalletAddress")}
                              </button>

                              <Link
                                href={`/send?address=${encodeURIComponent(
                                  contact.walletAddress
                                )}${
                                  contact.arivoId
                                    ? `&arivo=${encodeURIComponent(
                                        contact.arivoId
                                      )}`
                                    : ""
                                }`}
                                onClick={() =>
                                  setMenuId(null)
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                              >
                                <Send size={15} />
                                {t("common", "send")} money
                              </Link>

                              <Link
                                href={`/chat?contact=${encodeURIComponent(
                                  contact.id
                                )}`}
                                onClick={() =>
                                  setMenuId(null)
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-[#282828] hover:text-white"
                              >
                                <MessageCircle
                                  size={15}
                                />
                                {t("common", "message")}
                              </Link>

                              <div className="my-1 border-t border-[#2b2b2b]" />

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    contact.id
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2
                                  size={15}
                                />
                                {t("common", "deleteContact")}
                              </button>

                            </div>
                          ) : null}

                        </div>

                      </div>

                    </article>
                  )
                )}

              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-14 text-center">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#303030] bg-[#202020]">
                  <UserRound
                    size={22}
                    className="text-zinc-500"
                  />
                </div>

                <h2 className="mt-5 text-base font-semibold">
                  {savedQuery ||
                  favoritesOnly
                    ? t("common", "noMatchingContacts")
                    : t("common", "noSavedContacts")}
                </h2>

                <p className="mt-2 max-w-md text-xs leading-5 text-zinc-600">
                  Search an Arivo ID above to find
                  a person, or add a wallet address
                  manually.
                </p>

              </div>
            )}

          </section>

          

        </div>
      </main>

      {modalOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-[520px] rounded-3xl border border-[#303030] bg-[#171717] shadow-2xl">

            <div className="flex items-center justify-between border-b border-[#2b2b2b] px-5 py-4">

              <div>
                <p className="text-[10px] font-medium tracking-[0.18em] text-zinc-500">
                  {t("common", "recipient").toUpperCase()}
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  {t("common", "addContact")}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#202020] text-zinc-500 hover:text-white"
                aria-label={t("common", "close")}
              >
                <X size={17} />
              </button>

            </div>

            <form
              onSubmit={handleManualCreate}
              className="space-y-4 p-5"
            >

              <div>
                <label className="text-xs font-medium text-zinc-400">
                  {t("common", "contactName")}
                </label>

                <input
                  value={manualName}
                  onChange={(event) =>
                    setManualName(
                      event.target.value
                    )
                  }
                  placeholder={t("common", "contactNamePlaceholder")}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#303030] bg-[#202020] px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#4b4b4b]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">
                  {t("common", "recipientWalletAddress")}
                </label>

                <input
                  value={manualAddress}
                  onChange={(event) =>
                    setManualAddress(
                      event.target.value
                    )
                  }
                  placeholder="0x..."
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#303030] bg-[#202020] px-3 font-mono text-xs text-white outline-none placeholder:text-zinc-700 focus:border-[#4b4b4b]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">
                  {t("common", "note")}{" "}
                  <span className="text-zinc-700">
                    {t("common", "optional")}
                  </span>
                </label>

                <input
                  value={manualNote}
                  onChange={(event) =>
                    setManualNote(
                      event.target.value
                    )
                  }
                  placeholder={t("common", "notePlaceholder")}
                  className="mt-2 h-11 w-full rounded-xl border border-[#303030] bg-[#202020] px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#4b4b4b]"
                />
              </div>

              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--arivo-primary)] text-sm font-semibold text-black transition hover:bg-[var(--arivo-primary-hover)]"
              >
                <Plus size={17} />
                Save contact
              </button>

            </form>

          </div>

        </div>
      ) : null}

    </div>
  );
}