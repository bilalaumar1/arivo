"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import {
  ArrowLeft,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  WalletCards,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";

import {
  getContacts,
  type ArivoContact,
} from "@/lib/contacts";

import {
  getProfile,
  getProfileByArivoId,
} from "@/lib/profile";

import {
  getChatMessages,
  sendChatMessage,
  subscribeToConversation,
  type ChatMessage,
} from "@/lib/chat";

function shortAddress(address: string) {
  if (!address) return "";

  return `${address.slice(
    0,
    6
  )}...${address.slice(-6)}`;
}

function formatTime(value: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function getInitial(name: string) {
  return (
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "?"
  );
}

function cleanUsername(username: string) {
  return username.replace(/^@/, "").trim();
}

function ChatPageContent() {
  const { authenticated, user } = usePrivy();

  const searchParams =
    useSearchParams();

  const [contacts, setContacts] =
    useState<ArivoContact[]>([]);

  const [
    selectedContactId,
    setSelectedContactId,
  ] = useState<string | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [messageText, setMessageText] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const ownerWallet = useMemo(() => {
    return user?.wallet?.address || "";
  }, [user?.wallet?.address]);

  /*
   * --------------------------------------------------
   * SYNC CONTACT PROFILES
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
            ? await getProfileByArivoId(
                contact.arivoId
              )
            : await getProfile(
                contact.walletAddress
              );

          if (!profile) {
            return contact;
          }

          return {
            ...contact,

            /*
             * Always use latest username.
             */
            name: cleanUsername(
              profile.username
            ),

            /*
             * Always use latest avatar.
             */
            avatarUrl:
              profile.avatar ?? "",

            /*
             * Always keep latest Arivo ID.
             */
            arivoId:
              profile.arivo_id ||
              contact.arivoId ||
              "",
          };
        } catch (error) {
          console.error(
            "Failed to sync chat profile:",
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
   * LOAD CONTACTS + AUTO REFRESH
   * --------------------------------------------------
   */
  useEffect(() => {
    if (!ownerWallet) {
      setContacts([]);
      setSelectedContactId(null);
      return;
    }

    let cancelled = false;

    async function loadContacts() {
      const loadedContacts =
        getContacts(ownerWallet);

      /*
       * Show local data immediately.
       */
      setContacts(loadedContacts);

      /*
       * Sync current profiles immediately.
       */
      const synced =
        await syncContactProfiles(
          loadedContacts
        );

      if (cancelled) return;

      setContacts(synced);

      try {
        window.localStorage.setItem(
          `arivo:contacts:${ownerWallet.toLowerCase()}`,
          JSON.stringify(synced)
        );
      } catch (error) {
        console.error(
          "Failed to save synced chat contacts:",
          error
        );
      }

      const contactFromUrl =
        searchParams.get("contact");

      if (contactFromUrl) {
        const found = synced.find(
          (contact) =>
            contact.id === contactFromUrl ||
            contact.walletAddress.toLowerCase() ===
              contactFromUrl.toLowerCase()
        );

        if (found) {
          setSelectedContactId(found.id);
          return;
        }
      }

      setSelectedContactId((current) => {
        if (
          current &&
          synced.some(
            (contact) =>
              contact.id === current
          )
        ) {
          return current;
        }

        return synced[0]?.id ?? null;
      });
    }

    void loadContacts();

    /*
     * --------------------------------------------------
     * AUTO PROFILE REFRESH
     *
     * User A changes username/avatar
     *        ↓
     * Supabase updates
     *        ↓
     * User B Chat checks profile
     *        ↓
     * UI updates automatically
     * --------------------------------------------------
     */
    const interval =
      window.setInterval(() => {
        void (async () => {
          if (cancelled) return;

          const currentContacts =
            getContacts(ownerWallet);

          const synced =
            await syncContactProfiles(
              currentContacts
            );

          if (cancelled) return;

          setContacts((current) => {
            const currentJson =
              JSON.stringify(current);

            const syncedJson =
              JSON.stringify(synced);

            if (
              currentJson ===
              syncedJson
            ) {
              return current;
            }

            return synced;
          });

          try {
            window.localStorage.setItem(
              `arivo:contacts:${ownerWallet.toLowerCase()}`,
              JSON.stringify(synced)
            );
          } catch (error) {
            console.error(
              "Failed to persist chat contacts:",
              error
            );
          }
        })();
      }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    ownerWallet,
    searchParams,
  ]);

  /*
   * --------------------------------------------------
   * SELECTED CONTACT
   * --------------------------------------------------
   */
  const selectedContact = useMemo(() => {
    return (
      contacts.find(
        (contact) =>
          contact.id ===
          selectedContactId
      ) ?? null
    );
  }, [
    contacts,
    selectedContactId,
  ]);

  /*
   * --------------------------------------------------
   * LOAD CHAT + REALTIME
   * --------------------------------------------------
   */
  useEffect(() => {
    if (
      !ownerWallet ||
      !selectedContact
    ) {
      setMessages([]);
      return;
    }

    const contactWallet =
      selectedContact.walletAddress;

    let cancelled = false;

    setLoadingMessages(true);
    setError("");
    setMessages([]);

    async function loadConversation() {
      try {
        const loadedMessages =
          await getChatMessages(
            ownerWallet,
            contactWallet
          );

        if (!cancelled) {
          setMessages(
            loadedMessages
          );
        }
      } catch (err) {
        console.error(
          "Failed to load chat:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load conversation."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    void loadConversation();

    const unsubscribe =
      subscribeToConversation(
        ownerWallet,
        contactWallet,
        (newMessage) => {
          if (cancelled) return;

          setMessages(
            (current) => {
              const alreadyExists =
                current.some(
                  (message) =>
                    message.id ===
                    newMessage.id
                );

              if (alreadyExists) {
                return current;
              }

              return [
                ...current,
                newMessage,
              ];
            }
          );
        }
      );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    ownerWallet,
    selectedContact,
  ]);

  /*
   * --------------------------------------------------
   * SEND MESSAGE
   * --------------------------------------------------
   */
  async function handleSend(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !ownerWallet ||
      !selectedContact
    ) {
      return;
    }

    const text =
      messageText.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const newMessage =
        await sendChatMessage(
          ownerWallet,
          selectedContact.walletAddress,
          text
        );

      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id ===
              newMessage.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          newMessage,
        ];
      });

      setMessageText("");
    } catch (err) {
      console.error(
        "Failed to send message:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * --------------------------------------------------
   * SEARCH CONTACTS
   * --------------------------------------------------
   */
  const filteredContacts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return contacts;
      }

      return contacts.filter(
        (contact) => {
          return (
            contact.name
              .toLowerCase()
              .includes(query) ||
            contact.walletAddress
              .toLowerCase()
              .includes(query) ||
            contact.arivoId
              .toLowerCase()
              .includes(query) ||
            contact.note
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [contacts, search]);

  /*
   * --------------------------------------------------
   * NOT CONNECTED
   * --------------------------------------------------
   */
  if (
    !authenticated ||
    !ownerWallet
  ) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#111111] text-white">

        <Sidebar />

        <main className="flex min-w-0 flex-1 items-center justify-center">

          <div className="text-center">

            <MessageCircle className="mx-auto mb-4 h-10 w-10 text-[#d9cdb5]" />

            <h1 className="text-xl font-semibold">
              Connect your wallet
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Connect your Arivo wallet to
              use chat.
            </p>

          </div>

        </main>

      </div>
    );
  }

  /*
   * --------------------------------------------------
   * PAGE
   * --------------------------------------------------
   */
  return (
    <div className="flex h-screen overflow-hidden bg-[#111111] text-white">

      <Sidebar />

      <main className="min-w-0 flex-1 overflow-hidden">

        <div className="flex h-full min-h-0 flex-col">

          {/* HEADER */}

          <header className="flex h-[112px] shrink-0 items-center justify-between border-b border-white/[0.08] px-8">

            <div className="flex items-center gap-5">

              <button
                type="button"
                onClick={() =>
                  window.history.back()
                }
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#202020] text-white/80 transition hover:bg-[#292929]"
              >
                <ArrowLeft size={20} />
              </button>

              <div>

                <h1 className="text-[28px] font-semibold tracking-tight">
                  Arivo Chat
                </h1>

                <p className="mt-1 text-sm text-white/40">
                  Message people on Arivo and
                  keep conversations in one place.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#202020] px-4 py-3 text-sm text-white/60">

                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Arc Testnet

              </div>

              <button
                type="button"
                className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#202020] px-4 py-3 text-sm text-white/60 hover:text-white"
              >
                <span>•••</span>
                Details
              </button>

            </div>

          </header>

          {/* CHAT */}

          <div className="flex min-h-0 flex-1">

            {/* CONTACTS */}

            <aside className="flex w-[335px] shrink-0 flex-col border-r border-white/[0.08]">

              <div className="px-5 pt-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                      Messages
                    </p>

                    <h2 className="mt-2 text-lg font-semibold">
                      Contacts
                    </h2>

                  </div>

                  <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[0.06] px-2 text-xs text-white/45">
                    {contacts.length}
                  </div>

                </div>

                <div className="relative mt-5">

                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search contacts..."
                    className="h-12 w-full rounded-2xl border border-white/[0.08] bg-[#191919] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/[0.16]"
                  />

                </div>

              </div>

              <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-4">

                {filteredContacts.length ===
                0 ? (
                  <div className="px-4 py-10 text-center">

                    <p className="text-sm text-white/35">
                      No contacts found.
                    </p>

                  </div>
                ) : (
                  filteredContacts.map(
                    (contact) => {

                      const active =
                        contact.id ===
                        selectedContactId;

                      const lastMessage =
                        active &&
                        messages.length > 0
                          ? messages[
                              messages.length -
                                1
                            ]
                          : null;

                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setSelectedContactId(
                              contact.id
                            );

                            setError("");
                          }}
                          className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                            active
                              ? "bg-[#eee5d3] text-[#171717]"
                              : "text-white hover:bg-white/[0.04]"
                          }`}
                        >

                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${
                              active
                                ? "bg-[#ded4c0]"
                                : "bg-[#202020]"
                            }`}
                          >

                            {contact.avatarUrl ? (
                              <img
                                src={
                                  contact.avatarUrl
                                }
                                alt={
                                  contact.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span
                                className={`text-sm font-medium ${
                                  active
                                    ? "text-[#171717]"
                                    : "text-white/80"
                                }`}
                              >
                                {getInitial(
                                  contact.name
                                )}
                              </span>
                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-center justify-between gap-2">

                              <p className="truncate text-sm font-semibold">
                                {contact.name}
                              </p>

                              {lastMessage && (
                                <span
                                  className={`shrink-0 text-[10px] ${
                                    active
                                      ? "text-black/45"
                                      : "text-white/25"
                                  }`}
                                >
                                  {formatTime(
                                    lastMessage.createdAt
                                  )}
                                </span>
                              )}

                            </div>

                            <p
                              className={`mt-1 truncate text-xs ${
                                active
                                  ? "text-black/50"
                                  : "text-white/35"
                              }`}
                            >
                              {lastMessage
                                ? lastMessage.text
                                : contact.note ||
                                  shortAddress(
                                    contact.walletAddress
                                  )}
                            </p>

                          </div>

                        </button>
                      );
                    }
                  )
                )}

              </div>

            </aside>

            {/* CONVERSATION */}

            <section className="flex min-w-0 flex-1 flex-col">

              {!selectedContact ? (
                <div className="flex flex-1 items-center justify-center">

                  <div className="text-center">

                    <MessageCircle className="mx-auto mb-4 h-10 w-10 text-white/15" />

                    <h3 className="text-lg font-semibold text-white/70">
                      Select a contact
                    </h3>

                    <p className="mt-2 text-sm text-white/30">
                      Choose someone from your
                      contacts to start chatting.
                    </p>

                  </div>

                </div>
              ) : (
                <>

                  {/* CONVERSATION HEADER */}

                  <div className="flex h-[84px] shrink-0 items-center justify-between border-b border-white/[0.08] px-6">

                    <div className="flex items-center gap-3">

                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#202020] text-sm font-medium">

                        {selectedContact.avatarUrl ? (
                          <img
                            src={
                              selectedContact.avatarUrl
                            }
                            alt={
                              selectedContact.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitial(
                            selectedContact.name
                          )
                        )}

                      </div>

                      <div>

                        <h2 className="text-base font-semibold">
                          {selectedContact.name}
                        </h2>

                        <p className="mt-1 text-xs text-white/30">
                          {shortAddress(
                            selectedContact.walletAddress
                          )}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href =
                          `/send?address=${encodeURIComponent(
                            selectedContact.walletAddress
                          )}`;
                      }}
                      className="flex items-center gap-2 rounded-2xl bg-[#eee5d3] px-5 py-3 text-sm font-semibold text-[#171717] transition hover:bg-[#f5ecdc]"
                    >
                      <WalletCards size={17} />
                      Send funds
                    </button>

                  </div>

                  {/* MESSAGES */}

                  <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">

                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-sm text-white/30">
                          Loading conversation...
                        </div>
                      </div>
                    ) : messages.length ===
                      0 ? (
                      <div className="flex h-full flex-col items-center justify-center">

                        <div className="mb-4 rounded-full border border-white/[0.08] bg-[#191919] px-4 py-2 text-[11px] text-white/30">
                          Conversation
                        </div>

                        <p className="text-sm text-white/25">
                          No messages yet. Start
                          the conversation.
                        </p>

                      </div>
                    ) : (
                      <>

                        <div className="mb-8 flex justify-center">

                          <span className="rounded-full border border-white/[0.06] bg-[#191919] px-4 py-1.5 text-[10px] text-white/25">
                            Conversation
                          </span>

                        </div>

                        <div className="space-y-4">

                          {messages.map(
                            (message) => {

                              const mine =
                                message.sender ===
                                "me";

                              return (
                                <div
                                  key={
                                    message.id
                                  }
                                  className={`flex ${
                                    mine
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >

                                  <div
                                    className={`max-w-[65%] rounded-[20px] px-5 py-3.5 ${
                                      mine
                                        ? "rounded-br-md bg-[#eee5d3] text-[#171717]"
                                        : "rounded-bl-md bg-[#202020] text-white"
                                    }`}
                                  >

                                    <p className="text-sm leading-6">
                                      {message.text}
                                    </p>

                                    <div
                                      className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                                        mine
                                          ? "text-black/45"
                                          : "text-white/25"
                                      }`}
                                    >
                                      {formatTime(
                                        message.createdAt
                                      )}

                                      {mine && (
                                        <span>
                                          ✓
                                        </span>
                                      )}
                                    </div>

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>

                      </>
                    )}

                  </div>

                  {error && (
                    <div className="px-6 pb-2">

                      <div className="rounded-xl border border-red-400/10 bg-red-400/[0.05] px-4 py-2 text-xs text-red-300/80">
                        {error}
                      </div>

                    </div>
                  )}

                  {/* INPUT */}

                  <div className="shrink-0 border-t border-white/[0.08] px-6 py-5">

                    <form
                      onSubmit={handleSend}
                      className="flex items-center gap-3"
                    >

                      <button
                        type="button"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#191919] text-white/40 transition hover:text-white"
                      >
                        <Paperclip size={19} />
                      </button>

                      <input
                        value={messageText}
                        onChange={(event) =>
                          setMessageText(
                            event.target.value
                          )
                        }
                        placeholder={`Message ${selectedContact.name}...`}
                        disabled={sending}
                        className="h-12 min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-[#191919] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/[0.16] disabled:opacity-50"
                      />

                      <button
                        type="submit"
                        disabled={
                          !messageText.trim() ||
                          sending
                        }
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d9d0bf] text-[#171717] transition hover:bg-[#eee5d3] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send size={18} />
                      </button>

                    </form>

                  </div>

                </>
              )}

            </section>

          </div>

        </div>

      </main>

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#111111] text-white">
          <div className="text-sm text-white/40">Loading chat...</div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
