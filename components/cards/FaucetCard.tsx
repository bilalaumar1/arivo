export default function FaucetCard() {
  return (
    <div className="h-full rounded-[28px] border border-[#2b2b2b] bg-[#1a1a1a] p-6">

      <h3 className="text-xl font-semibold text-white">
        Get Test USDC
      </h3>

      <p className="mt-2 text-sm text-zinc-500">
        Need test USDC?
      </p>

      <button className="mt-6 h-12 w-full rounded-xl bg-[#efe5d2] text-sm font-semibold text-black transition hover:bg-[#e5dac5]">
        Go to Faucet ↗
      </button>

    </div>
  );
}