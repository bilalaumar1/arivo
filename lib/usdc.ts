import { erc20Abi, formatUnits } from "viem";
import { publicClient } from "./publicClient";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export async function getUSDCBalance(address: `0x${string}`) {
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  return formatUnits(balance, 6);
}