"use client";

import { useState } from "react";

type Props = {
  onContinue: (username: string) => void;
};

export default function ProfileStep({
  onContinue,
}: Props) {
  const [username, setUsername] = useState("");

  return (
    <div className="space-y-8 rounded-3xl border border-white/10 bg-[#151515] p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Choose your username
        </h1>

        <p className="mt-2 text-zinc-400">
          Others will be able to send you USDC using this username.
        </p>
      </div>

      <div>
        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.toLowerCase())
          }
          placeholder="@bilal"
          className="h-14 w-full rounded-2xl border border-white/10 bg-[#1c1c1c] px-5 text-white outline-none"
        />
      </div>

      <button
        disabled={username.length < 3}
        onClick={() => onContinue(username)}
        className="h-14 w-full rounded-2xl bg-[#efe5d2] font-semibold text-black disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}