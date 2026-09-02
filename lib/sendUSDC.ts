import {
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
  type EIP1193Provider,
} from "viem";

import { arcTestnet } from "viem/chains";

const USDC =
  "0x3600000000000000000000000000000000000000" as const;

export async function sendUSDC(
  recipient: `0x${string}`,
  amount: string,
  provider?: EIP1193Provider
) {
  const transactionProvider =
    provider ??
    (typeof window !== "undefined"
      ? window.ethereum
      : undefined);

  if (!transactionProvider) {
    throw new Error("Wallet provider not found");
  }

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom(transactionProvider),
  });

  const [account] = await walletClient.getAddresses();

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const hash = await walletClient.writeContract({
    account,
    chain: arcTestnet,
    address: USDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient,
      parseUnits(amount, 6),
    ],
  });

  return hash;
}