const BASE_URL = "https://testnet.arcscan.app/api/v2";

export type Transaction = {
  hash: string;
  from: string;
  to: string;
  amount: number;
  symbol: string;
  decimals: number;
  timestamp: string;
  blockNumber: number;
  method: string;
  sent: boolean;
};

export async function getAddressTransactions(
  address: string
): Promise<Transaction[]> {
  const res = await fetch(
    `${BASE_URL}/addresses/${address}/token-transfers`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch transactions");
  }

  const data = await res.json();

  const wallet = address.toLowerCase();

  return (data.items ?? []).map((tx: any) => {
    const from = tx.from?.hash ?? "";
    const to = tx.to?.hash ?? "";
    const decimals = Number(tx.token?.decimals ?? 6);

    return {
      hash: tx.transaction_hash,
      from,
      to,
      amount:
        Number(tx.total?.value ?? 0) /
        Math.pow(10, decimals),
      symbol: tx.token?.symbol ?? "USDC",
      decimals,
      timestamp: tx.timestamp,
      blockNumber: tx.block_number,
      method: tx.method ?? "transfer",
      sent: from.toLowerCase() === wallet,
    };
  });
}