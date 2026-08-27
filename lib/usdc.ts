import { publicClient } from "@/lib/publicClient";
import { formatUnits, type Address } from "viem";

/*
 * Arc USDC has two interfaces backed by the same balance:
 * - native balance: 18 decimals
 * - ERC-20 facade: 6 decimals
 *
 * Read the native balance here so balance checks do not require
 * an eth_call to the USDC facade on the public RPC.
 */
export async function getUSDCBalance(
  address: `0x${string}` | Address
) {
  const balance = await publicClient.getBalance({
    address: address as Address,
  });

  return formatUnits(balance, 18);
}
