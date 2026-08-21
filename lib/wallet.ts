import { getUSDCBalance } from "./usdc";

export async function getWalletBalance(
  address: `0x${string}`
) {
  return await getUSDCBalance(address);
}

export async function getWalletTransactions(
  address: `0x${string}`
) {
  console.log("Transactions for:", address);

  return [];
}