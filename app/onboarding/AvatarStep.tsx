"use client";

import Image from "next/image";

type Props = {
  username?: string;
  onContinue: () => void;
};

export default function AvatarStep({
  username,
  onContinue,
}: Props) {
  const avatar =
    username && username.length > 0
      ? `https://api.dicebear.com/9.x/personas/png?seed=${encodeURIComponent(
          username
        )}`
      : "";

  return (
    <div className="space-y-8 rounded-3xl border border-white/10 bg-[#151515] p-8">
      <div className="flex flex-col items-center">
        {avatar && (
          <Image
            src={avatar}
            alt="Avatar"
            width={110}
            height={110}
            className="mb-5 rounded-full border border-[#2b2b2b]"
            unoptimized
          />
        )}

        <h1 className="text-center text-3xl font-bold text-white">
          You're all set!
        </h1>

        <p className="mt-2 text-center text-zinc-400">
          Your Arivo profile is ready.
          <br />
          Click below to finish creating your account.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="h-14 w-full rounded-2xl bg-[#efe5d2] font-semibold text-black transition hover:opacity-90"
      >
        Finish
      </button>
    </div>
  );
}