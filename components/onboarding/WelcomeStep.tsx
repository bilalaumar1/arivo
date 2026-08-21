"use client";

type Props = {
  onContinue: () => void;
};

export default function WelcomeStep({
  onContinue,
}: Props) {
  return (
    <div className="rounded-3xl border border-[#232323] bg-[#161616] p-10">

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--arivo-primary)]">
        <span className="text-4xl font-black text-black">
          A
        </span>
      </div>

      <h1 className="mt-8 text-center text-4xl font-bold text-white">
        Welcome to Arivo
      </h1>

      <p className="mx-auto mt-4 max-w-sm text-center text-zinc-400">
        Your wallet is connected successfully.
        Let's personalize your account before
        you start using Arivo.
      </p>

      <button
        onClick={onContinue}
        className="mt-10 h-14 w-full rounded-2xl bg-[var(--arivo-primary)] text-lg font-semibold text-black transition hover:opacity-90"
      >
        Continue
      </button>

    </div>
  );
}