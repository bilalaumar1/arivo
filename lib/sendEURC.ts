import {
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
} from "viem";

import { publicClient } from "./publicClient";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export async function sendEURC(
  recipient: `0x${string}`,
  amount: string
) {
  if (!window.ethereum) {
    throw new Error("Wallet provider not found");
  }

  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });

  const [account] =
    await walletClient.getAddresses();

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const hash =
    await walletClient.writeContract({
      account,
      chain: publicClient.chain,
      address: EURC_ADDRESS,
      abi: erc20BalanceAbi,
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

const erc20BalanceAbi = erc20Abi;