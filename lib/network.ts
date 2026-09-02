import { ARC_TESTNET } from "./arc";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type PrivyWallet = {
  switchChain?: (chainId: number) => Promise<void>;
};

export async function switchToArcNetwork(
  privyWallet?: PrivyWallet | null
) {
  // Google / Privy Embedded Wallet
  if (privyWallet?.switchChain) {
    await privyWallet.switchChain(5042002);
    return;
  }

  // External wallet (MetaMask)
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainId }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ARC_TESTNET],
      });
    } else {
      throw error;
    }
  }
}

export async function getCurrentChainId() {
  if (!window.ethereum) return null;

  return await window.ethereum.request({
    method: "eth_chainId",
  });
}