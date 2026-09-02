import {
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
  type EIP1193Provider,
} from "viem";

import { arcTestnet } from "viem/chains";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export async function sendEURC(
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
    address: EURC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient,
      parseUnits(amount, 6),
    ],
  });

  return hash;
}