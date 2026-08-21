import { ARC_TESTNET } from "./arc";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function switchToArcNetwork() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  try {
    // حاول تبديل الشبكة
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainId }],
    });
  } catch (error: any) {
    // إذا Arc Testnet ما كانتش موجودة
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