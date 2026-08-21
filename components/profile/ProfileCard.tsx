"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Check, Pencil, Fingerprint } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

import EditUsernameModal from "@/components/modals/EditUsernameModal";
import EditAvatarModal from "@/components/modals/EditAvatarModal";

import {
  getProfile,
  usernameExists,
  updateUsername,
} from "@/lib/profile";

export default function ProfileCard() {
  const { user } = usePrivy();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [arivoId, setArivoId] = useState("");

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedArivoId, setCopiedArivoId] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [openAvatar, setOpenAvatar] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.wallet?.address) return;

      const profile = await getProfile(user.wallet.address);

      if (!profile) return;

      const cleanUsername = profile.username.replace("@", "");

      setUsername(cleanUsername);
      setArivoId(profile.arivo_id ?? "");

      if (profile.avatar && profile.avatar.trim() !== "") {
        setAvatar(profile.avatar);
      } else {
        setAvatar(
          `https://api.dicebear.com/9.x/personas/png?seed=${cleanUsername}`
        );
      }
    }

    loadProfile();
  }, [user]);

  async function handleUpdateUsername(newUsername: string) {
    if (!user?.wallet?.address) return;

    const cleanUsername = newUsername.trim();

    if (!cleanUsername) {
      alert("Username is required.");
      return;
    }

    if (
      cleanUsername.toLowerCase() !==
      username.toLowerCase()
    ) {
      const exists = await usernameExists(
        "@" + cleanUsername
      );

      if (exists) {
        alert("Username already exists.");
        return;
      }
    }

    try {
      setSaving(true);

      await updateUsername(
        user.wallet.address,
        cleanUsername
      );

      setUsername(cleanUsername);
      setOpenModal(false);
    } catch (error) {
      console.error("UPDATE USERNAME ERROR:", error);
    } finally {
      setSaving(false);
    }
  }

  const wallet = user?.wallet?.address ?? "";

  const shortWallet =
    wallet.length > 12
      ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
      : wallet;

  async function handleCopyWallet() {
    if (!wallet) return;

    await navigator.clipboard.writeText(wallet);

    setCopiedWallet(true);

    setTimeout(() => {
      setCopiedWallet(false);
    }, 2000);
  }

  async function handleCopyArivoId() {
    if (!arivoId) return;

    await navigator.clipboard.writeText(arivoId);

    setCopiedArivoId(true);

    setTimeout(() => {
      setCopiedArivoId(false);
    }, 2000);
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#2b2b2b] bg-[#181818] p-10">

        {/* Profile */}
        <div className="flex flex-col items-center">

          {/* Avatar */}
          {avatar && (
            <Image
              src={avatar}
              alt={username || "Profile"}
              width={120}
              height={120}
              className="rounded-full border border-[#2b2b2b]"
              unoptimized
            />
          )}

          {/* Username */}
          <h1 className="mt-6 text-3xl font-bold text-white">
            {username}
          </h1>

          <p className="mt-2 text-zinc-500">
            @{username}
          </p>

          {/* Wallet */}
          <button
            onClick={handleCopyWallet}
            className="mt-6 flex items-center gap-2 rounded-xl border border-[#2b2b2b] px-5 py-3 text-zinc-300 transition hover:bg-[#232323]"
          >
            {copiedWallet ? (
              <Check
                size={16}
                className="text-green-500"
              />
            ) : (
              <Copy size={16} />
            )}

            <span>
              {copiedWallet ? "Copied!" : shortWallet}
            </span>
          </button>

          {/* Arivo ID */}
{arivoId && (
  <button
    onClick={handleCopyArivoId}
    className="mt-4 flex items-center gap-2 rounded-xl border border-[#2b2b2b] px-5 py-3 text-zinc-300 transition hover:bg-[#232323]"
  >
    {copiedArivoId ? (
      <Check
        size={16}
        className="text-green-500"
      />
    ) : (
      <Fingerprint size={16} />
    )}

    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500">
        Arivo ID
      </span>

      <span className="text-white">
        {copiedArivoId ? "Copied!" : arivoId}
      </span>
    </div>
  </button>
)}

        </div>

        {/* Actions */}
        <div className="mt-12 grid grid-cols-2 gap-5">

          {/* Change Username */}
          <button
            onClick={() => setOpenModal(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--arivo-primary)] font-semibold text-black transition hover:opacity-90"
          >
            <Pencil size={16} />
            Change Username
          </button>

          {/* Change Avatar */}
          <button
            onClick={() => setOpenAvatar(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#2b2b2b] text-white transition hover:bg-[#232323]"
          >
            <Pencil size={16} />
            Change Avatar
          </button>

        </div>

      </div>

      {/* Username Modal */}
      {openModal && (
        <EditUsernameModal
          currentUsername={username}
          loading={saving}
          onClose={() => setOpenModal(false)}
          onSave={handleUpdateUsername}
        />
      )}

      {/* Avatar Modal */}
      {openAvatar && (
        <EditAvatarModal
          open={openAvatar}
          onClose={() => setOpenAvatar(false)}
          wallet={wallet}
          currentAvatar={avatar}
          onSaved={(newAvatar) => {
            setAvatar(newAvatar);
          }}
        />
      )}
    </>
  );
}