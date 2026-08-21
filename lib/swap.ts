import { SwapKit } from "@circle-fin/swap-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";

const kit = new SwapKit();

const privateKey = process.env.SWAP_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Missing SWAP_PRIVATE_KEY");
}

const adapter = createViemAdapterFromPrivateKey({
  privateKey: privateKey as `0x${string}`,
});

export async function estimateSwap(
  tokenIn: "USDC" | "EURC",
  tokenOut: "USDC" | "EURC",
  amount: string
) {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid swap amount");
  }

  if (tokenIn === tokenOut) {
    throw new Error("You cannot convert the same asset.");
  }

  const estimate = await kit.estimate({
    from: {
      adapter,
      chain: "Arc_Testnet",
    },

    tokenIn,
    tokenOut,

    amountIn: amount,

    config: {
      kitKey: process.env.KIT_KEY as string,
    },
  });

  return estimate;
}

export async function executeSwap(
  tokenIn: "USDC" | "EURC",
  tokenOut: "USDC" | "EURC",
  amount: string
) {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid swap amount");
  }

  if (tokenIn === tokenOut) {
    throw new Error("You cannot convert the same asset.");
  }

  const result = await kit.swap({
    from: {
      adapter,
      chain: "Arc_Testnet",
    },

    tokenIn,
    tokenOut,

    amountIn: amount,

    config: {
      kitKey: process.env.KIT_KEY as string,
    },
  });

  return result;
}