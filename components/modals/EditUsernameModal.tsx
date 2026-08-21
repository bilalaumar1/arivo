"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  currentUsername: string;
  loading: boolean;
  onClose: () => void;
  onSave: (username: string) => Promise<void>;
};

export default function EditUsernameModal({
  currentUsername,
  loading,
  onClose,
  onSave,
}: Props) {
  const [username, setUsername] = useState(currentUsername);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#2b2b2b] bg-[#181818] p-6">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Change Username
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-[#232323]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-3 text-sm text-zinc-500">
          Choose a unique username.
        </p>

        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.replace("@", ""))
          }
          className="h-12 w-full rounded-xl border border-[#2b2b2b] bg-[#111111] px-4 text-white outline-none focus:border-[var(--arivo-primary)]"
          placeholder="bilal"
        />

        <div className="mt-6 flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#2b2b2b] py-3 text-white hover:bg-[#232323]"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={() => onSave(username)}
            className="flex-1 rounded-xl bg-[var(--arivo-primary)] py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>

        </div>

      </div>
    </div>
  );
}