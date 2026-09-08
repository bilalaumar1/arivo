import {
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
  type EIP1193Provider,
  type Address,
} from "viem";

import { publicClient } from "./publicClient";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export async function sendEURC(
  recipient: `0x${string}`,
  amount: string,
  provider?: EIP1193Provider,
  account?: Address
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
    transport: custom(transactionProvider),
  });

  // Privy embedded providers may not expose the active account
  // through eth_accounts. Use the wallet address supplied by the
  // caller when available, while keeping the old fallback for
  // external wallets.
  const resolvedAccount =
    account ?? (await walletClient.getAddresses())[0];

  if (!resolvedAccount) {
    throw new Error("Wallet account not found");
  }

  const hash = await walletClient.writeContract({
    account: resolvedAccount,
    chain: publicClient.chain,
    address: EURC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient,
      parseUnits(amount, 6),
    ],
  });

  await publicClient.waitForTransactionReceipt({
    hash,
  });

  return hash;
}
