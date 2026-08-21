"use client";

import Image from "next/image";
import { useState } from "react";
import { updateAvatar } from "@/lib/profile";

type Props = {
  open: boolean;
  onClose: () => void;
  wallet: string;
  currentAvatar: string;
  onSaved: (avatar: string) => void;
};

const avatars = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  url: `https://api.dicebear.com/9.x/personas/png?seed=avatar-${i + 1}`,
}));

export default function EditAvatarModal({
  open,
  onClose,
  wallet,
  currentAvatar,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState(
    currentAvatar || avatars[0].url
  );

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSave() {
    try {
      setLoading(true);

      await updateAvatar(wallet, selected);

      onSaved(selected);

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update avatar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-full max-w-2xl rounded-3xl border border-[#2b2b2b] bg-[#181818] p-8">

        <h2 className="text-2xl font-bold text-white">
          Choose your avatar
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Pick one of the generated avatars.
        </p>

        <div className="mt-8 grid grid-cols-4 gap-5">

          {avatars.map((avatar) => (

            <button
              key={avatar.id}
              onClick={() => setSelected(avatar.url)}
              className={`rounded-2xl border-2 p-2 transition ${
                selected === avatar.url
                  ? "border-[var(--arivo-primary)]"
                  : "border-transparent hover:border-[#3a3a3a]"
              }`}
            >
              <Image
                src={avatar.url}
                alt=""
                width={90}
                height={90}
                className="rounded-xl"
                unoptimized
              />
            </button>

          ))}

        </div>

        <div className="mt-8 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="rounded-2xl border border-[#2b2b2b] px-6 py-3 text-white transition hover:bg-[#232323]"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-2xl bg-[var(--arivo-primary)] px-6 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>

        </div>

      </div>

    </div>
  );
}