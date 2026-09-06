"use client";

import { useCallback, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import {
  createWalletClient,
  custom,
  maxUint256,
  parseUnits,
  type Address,
  type EIP1193Provider,
} from "viem";

import { publicClient } from "@/lib/publicClient";

import {
  LENDING_ASSETS,
  LENDING_POOL_ADDRESS,
  LENDING_CHAIN_ID,
  type LendingAsset,
} from "./config";

import { lendingPoolAbi } from "./abi";

/* ============================================================
   CONSTANTS
   ============================================================ */

const ZERO = BigInt(0);

const ARC_TESTNET_CHAIN_ID =
  Number(LENDING_CHAIN_ID);

const ARC_TESTNET_CHAIN_ID_HEX =
  `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`;

const ARC_TESTNET_RPC =
  "https://rpc.testnet.arc.network";

const ARC_TESTNET_EXPLORER =
  "https://testnet.arcscan.app";

/* ============================================================
   GENERIC EIP-1193 PROVIDER
   ============================================================ */

type TransactionProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

/* ============================================================
   STATE TYPES
   ============================================================ */

export type EarnStep =
  | "idle"
  | "switching"
  | "checking"
  | "approving"
  | "supplying"
  | "withdrawing"
  | "success"
  | "error";

export type EarnState = {
  step: EarnStep;
  txHash?: `0x${string}`;
  error?: string;
};

type UseEarnResult = {
  supply: (
    asset: LendingAsset,
    amount: string
  ) => Promise<`0x${string}`>;

  withdraw: (
    asset: LendingAsset,
    amount: string
  ) => Promise<`0x${string}`>;

  state: EarnState;

  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;

  reset: () => void;
};

/* ============================================================
   EXTERNAL WALLET → ARC TESTNET
   ============================================================ */

async function ensureExternalArcTestnet(
  provider: TransactionProvider
): Promise<void> {
  const currentChainId =
    await provider.request({
      method: "eth_chainId",
    });

  const currentChainIdNumber =
    typeof currentChainId === "string"
      ? parseInt(currentChainId, 16)
      : Number(currentChainId);

  if (
    currentChainIdNumber ===
    ARC_TESTNET_CHAIN_ID
  ) {
    return;
  }

  try {
    await provider.request({
      method:
        "wallet_switchEthereumChain",
      params: [
        {
          chainId:
            ARC_TESTNET_CHAIN_ID_HEX,
        },
      ],
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? Number(
            (
              error as {
                code?: unknown;
              }
            ).code
          )
        : undefined;

    if (code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId:
            ARC_TESTNET_CHAIN_ID_HEX,

          chainName: "Arc Testnet",

          nativeCurrency: {
            name: "USDC",
            symbol: "USDC",
            decimals: 18,
          },

          rpcUrls: [
            ARC_TESTNET_RPC,
          ],

          blockExplorerUrls: [
            ARC_TESTNET_EXPLORER,
          ],
        },
      ],
    });

    await provider.request({
      method:
        "wallet_switchEthereumChain",
      params: [
        {
          chainId:
            ARC_TESTNET_CHAIN_ID_HEX,
        },
      ],
    });
  }

  const finalChainId =
    await provider.request({
      method: "eth_chainId",
    });

  const finalChainIdNumber =
    typeof finalChainId === "string"
      ? parseInt(finalChainId, 16)
      : Number(finalChainId);

  if (
    finalChainIdNumber !==
    ARC_TESTNET_CHAIN_ID
  ) {
    throw new Error(
      `Wallet is not connected to Arc Testnet. Current chain: ${finalChainIdNumber}`
    );
  }
}

/* ============================================================
   PROVIDER
   ============================================================ */

async function getTransactionProvider(
  activeWallet:
    | {
        address: string;

        switchChain: (
          chainId: number
        ) => Promise<void>;

        getEthereumProvider: () =>
          Promise<unknown>;
      }
    | undefined
): Promise<TransactionProvider> {
  /*
   * Privy embedded wallet
   */
  if (activeWallet) {
    return (
      (await activeWallet.getEthereumProvider()) as TransactionProvider
    );
  }

  /*
   * External wallet such as MetaMask
   */
  if (
    typeof window !== "undefined" &&
    window.ethereum
  ) {
    return window.ethereum as unknown as TransactionProvider;
  }

  throw new Error(
    "Wallet provider not found. Please connect your wallet."
  );
}

/* ============================================================
   WALLET CLIENT
   ============================================================ */

function createEarnWalletClient(
  walletAddress: Address,
  provider: TransactionProvider
) {
  return createWalletClient({
    account: walletAddress,

    chain: {
      id: ARC_TESTNET_CHAIN_ID,

      name: "Arc Testnet",

      nativeCurrency: {
        name: "USDC",
        symbol: "USDC",
        decimals: 18,
      },

      rpcUrls: {
        default: {
          http: [
            ARC_TESTNET_RPC,
          ],
        },
      },

      blockExplorers: {
        default: {
          name: "ArcScan",
          url: ARC_TESTNET_EXPLORER,
        },
      },
    },

    transport: custom(
      provider as EIP1193Provider
    ),
  });
}

/* ============================================================
   HOOK
   ============================================================ */

export default function useEarn(): UseEarnResult {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const [state, setState] =
    useState<EarnState>({
      step: "idle",
    });

  /* ==========================================================
     RESET
     ========================================================== */

  const reset = useCallback(() => {
    setState({
      step: "idle",
    });
  }, []);

  /* ==========================================================
     SUPPLY
     ========================================================== */

  const supply = useCallback(
    async (
      asset: LendingAsset,
      amount: string
    ): Promise<`0x${string}`> => {
      const walletAddress =
        user?.wallet?.address as
          | Address
          | undefined;

      if (!walletAddress) {
        throw new Error(
          "No connected wallet."
        );
      }

      if (!amount.trim()) {
        throw new Error(
          "Enter an amount."
        );
      }

      const config =
        LENDING_ASSETS[asset];

      const parsedAmount =
        parseUnits(
          amount,
          config.decimals
        );

      if (parsedAmount <= ZERO) {
        throw new Error(
          "Amount must be greater than zero."
        );
      }

      try {
        /* ======================================================
           SWITCH NETWORK
           ====================================================== */

        setState({
          step: "switching",
        });

        const activeWallet =
          wallets.find(
            (wallet) =>
              wallet.address.toLowerCase() ===
              walletAddress.toLowerCase()
          );

        const provider =
          await getTransactionProvider(
            activeWallet
          );

        /*
         * Privy embedded wallet
         */
        if (activeWallet) {
          await activeWallet.switchChain(
            ARC_TESTNET_CHAIN_ID
          );
        } else {
          /*
           * External wallet
           */
          await ensureExternalArcTestnet(
            provider
          );
        }

        /* ======================================================
           WALLET CLIENT
           ====================================================== */

        const walletClient =
          createEarnWalletClient(
            walletAddress,
            provider
          );

        /* ======================================================
           CHECK ALLOWANCE
           ====================================================== */

        setState({
          step: "checking",
        });

        const allowance =
          await publicClient.readContract({
            address:
              config.underlying,

            abi: [
              {
                type: "function",

                name: "allowance",

                stateMutability: "view",

                inputs: [
                  {
                    name: "owner",
                    type: "address",
                  },
                  {
                    name: "spender",
                    type: "address",
                  },
                ],

                outputs: [
                  {
                    name: "",
                    type: "uint256",
                  },
                ],
              },
            ],

            functionName:
              "allowance",

            args: [
              walletAddress,
              LENDING_POOL_ADDRESS,
            ],
          });

        /* ======================================================
           APPROVAL
           ====================================================== */

        if (
          allowance <
          parsedAmount
        ) {
          setState({
            step: "approving",
          });

          const approvalHash =
            await walletClient.writeContract(
              {
                address:
                  config.underlying,

                abi: [
                  {
                    type: "function",

                    name: "approve",

                    stateMutability:
                      "nonpayable",

                    inputs: [
                      {
                        name:
                          "spender",
                        type:
                          "address",
                      },
                      {
                        name:
                          "amount",
                        type:
                          "uint256",
                      },
                    ],

                    outputs: [
                      {
                        name: "",
                        type:
                          "bool",
                      },
                    ],
                  },
                ],

                functionName:
                  "approve",

                args: [
                  LENDING_POOL_ADDRESS,
                  maxUint256,
                ],

                account:
                  walletAddress,

                chain:
                  walletClient.chain,
              }
            );

          /*
           * Wait for approval confirmation
           */
          await publicClient.waitForTransactionReceipt(
            {
              hash: approvalHash,
            }
          );
        }

        /* ======================================================
           SUPPLY
           ====================================================== */

        setState({
          step: "supplying",
        });

        const supplyHash =
          await walletClient.writeContract(
            {
              address:
                LENDING_POOL_ADDRESS,

              abi:
                lendingPoolAbi,

              functionName:
                "supply",

              args: [
                config.underlying,
                parsedAmount,
                walletAddress,
              ],

              account:
                walletAddress,

              chain:
                walletClient.chain,
            }
          );

        /* ======================================================
           WAIT CONFIRMATION
           ====================================================== */

        const receipt =
          await publicClient.waitForTransactionReceipt(
            {
              hash: supplyHash,
            }
          );

        if (
          receipt.status !==
          "success"
        ) {
          throw new Error(
            "Supply transaction reverted."
          );
        }

        /* ======================================================
           SUCCESS
           ====================================================== */

        setState({
          step: "success",
          txHash: supplyHash,
        });

        window.dispatchEvent(
          new Event("refreshBalance")
        );

        window.dispatchEvent(
          new Event("refreshEarn")
        );

        return supplyHash;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          "Earn supply failed:",
          error
        );

        setState({
          step: "error",
          error: message,
        });

        throw error;
      }
    },
    [
      user?.wallet?.address,
      wallets,
    ]
  );

  /* ==========================================================
     WITHDRAW
     ========================================================== */

  const withdraw = useCallback(
    async (
      asset: LendingAsset,
      amount: string
    ): Promise<`0x${string}`> => {
      const walletAddress =
        user?.wallet?.address as
          | Address
          | undefined;

      if (!walletAddress) {
        throw new Error(
          "No connected wallet."
        );
      }

      const config =
        LENDING_ASSETS[asset];

      let withdrawAmount: bigint;

      /* ======================================================
         MAX WITHDRAW
         ====================================================== */

      if (
        amount.trim().toLowerCase() ===
        "max"
      ) {
        withdrawAmount =
          maxUint256;
      } else {
        if (!amount.trim()) {
          throw new Error(
            "Enter an amount."
          );
        }

        withdrawAmount =
          parseUnits(
            amount,
            config.decimals
          );

        if (
          withdrawAmount <= ZERO
        ) {
          throw new Error(
            "Amount must be greater than zero."
          );
        }
      }

      try {
        /* ======================================================
           SWITCH NETWORK
           ====================================================== */

        setState({
          step: "switching",
        });

        const activeWallet =
          wallets.find(
            (wallet) =>
              wallet.address.toLowerCase() ===
              walletAddress.toLowerCase()
          );

        const provider =
          await getTransactionProvider(
            activeWallet
          );

        /*
         * Privy embedded wallet
         */
        if (activeWallet) {
          await activeWallet.switchChain(
            ARC_TESTNET_CHAIN_ID
          );
        } else {
          /*
           * External wallet
           */
          await ensureExternalArcTestnet(
            provider
          );
        }

        /* ======================================================
           WALLET CLIENT
           ====================================================== */

        const walletClient =
          createEarnWalletClient(
            walletAddress,
            provider
          );

        /* ======================================================
           WITHDRAW
           ====================================================== */

        setState({
          step: "withdrawing",
        });

        const withdrawHash =
          await walletClient.writeContract(
            {
              address:
                LENDING_POOL_ADDRESS,

              abi:
                lendingPoolAbi,

              functionName:
                "withdraw",

              args: [
                config.underlying,
                withdrawAmount,
                walletAddress,
              ],

              account:
                walletAddress,

              chain:
                walletClient.chain,
            }
          );

        /* ======================================================
           WAIT CONFIRMATION
           ====================================================== */

        const receipt =
          await publicClient.waitForTransactionReceipt(
            {
              hash: withdrawHash,
            }
          );

        if (
          receipt.status !==
          "success"
        ) {
          throw new Error(
            "Withdraw transaction reverted."
          );
        }

        /* ======================================================
           SUCCESS
           ====================================================== */

        setState({
          step: "success",
          txHash: withdrawHash,
        });

        window.dispatchEvent(
          new Event("refreshBalance")
        );

        window.dispatchEvent(
          new Event("refreshEarn")
        );

        return withdrawHash;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          "Earn withdraw failed:",
          error
        );

        setState({
          step: "error",
          error: message,
        });

        throw error;
      }
    },
    [
      user?.wallet?.address,
      wallets,
    ]
  );

  /* ==========================================================
     RETURN
     ========================================================== */

  return {
    supply,

    withdraw,

    state,

    isPending:
      state.step === "switching" ||
      state.step === "checking" ||
      state.step === "approving" ||
      state.step === "supplying" ||
      state.step === "withdrawing",

    isSuccess:
      state.step === "success",

    isError:
      state.step === "error",

    reset,
  };
}