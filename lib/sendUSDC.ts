import {
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
} from "viem";

import { publicClient } from "./publicClient";

const USDC =
  "0x3600000000000000000000000000000000000000" as const;

export async function sendUSDC(
  recipient: `0x${string}`,
  amount: string
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    account,
    chain: publicClient.chain,
    address: USDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient,
      parseUnits(amount, 6),
    ],
  });

  // ✅ Wait until transaction is confirmed
  await publicClient.waitForTransactionReceipt({
    hash,
  });

  return hash;
}