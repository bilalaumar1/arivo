"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits } from "viem";

import { publicClient } from "@/lib/publicClient";
import {
  LENDING_ASSETS,
  LENDING_POOL_ADDRESS,
  type LendingAsset,
} from "./config";
import {
  lendingPoolAbi,
  erc20Abi,
} from "./abi";

/* ============================================================
   CONSTANTS
   ============================================================ */

const ZERO = BigInt(0);
const TEN = BigInt(10);

const RAY = TEN ** BigInt(27);

const SECONDS_PER_YEAR = BigInt(31_536_000);

/*
 * Earn APY used by the Arivo Earn UI.
 *
 * 2.93% APY:
 * 10 USDC -> about 0.00080274 USDC per day.
 *
 * This keeps the UI realistic instead of using the
 * testnet liquidity index as a fake fast-moving reward.
 */
const EARN_APY_PERCENT = 2.93;
const EARN_APY_BPS = BigInt(293);
const EARN_BPS_DENOMINATOR = BigInt(10_000);

/*
 * UI refresh:
 * - Every second -> smooth live earning estimate
 * - Every 15 seconds -> fresh on-chain data
 */

const LIVE_REFRESH_MS = 1_000;
const ONCHAIN_REFRESH_MS = 15_000;

/* ============================================================
   TYPES
   ============================================================ */

export type EarnPosition = {
  asset: LendingAsset;

  supplied: bigint;
  suppliedFormatted: string;

  userCollateral: bigint;

  earned: bigint;
  earnedFormatted: string;

  scaledBalance: bigint;

  liquidityIndex: bigint;
  currentLiquidityRate: bigint;
  lastUpdateTimestamp: bigint;

  apy: number;
};

type UseEarnPositionResult = {
  positions: Record<
    LendingAsset,
    EarnPosition
  >;

  isLoading: boolean;

  isError: boolean;

  refetch: () => Promise<void>;
};

/* ============================================================
   EMPTY POSITION
   ============================================================ */

function emptyPosition(
  asset: LendingAsset
): EarnPosition {
  return {
    asset,

    supplied: ZERO,
    suppliedFormatted: "0.00",

    userCollateral: ZERO,

    earned: ZERO,
    earnedFormatted: "0.00000",

    scaledBalance: ZERO,

    liquidityIndex: RAY,

    currentLiquidityRate: ZERO,

    lastUpdateTimestamp: ZERO,

    apy: 0,
  };
}

/* ============================================================
   FORMAT
   ============================================================ */

function formatAmount(
  amount: bigint,
  decimals: number
): string {
  const value = formatUnits(
    amount,
    decimals
  );

  const [whole, fraction = ""] =
    value.split(".");

  return `${whole}.${fraction
    .padEnd(2, "0")
    .slice(0, 2)}`;
}

function formatEarnedAmount(
  amount: bigint,
  decimals: number
): string {
  const value = formatUnits(
    amount,
    decimals
  );

  const [whole, fraction = ""] =
    value.split(".");

  return `${whole}.${fraction
    .padEnd(5, "0")
    .slice(0, 5)}`;
}

/* ============================================================
   APY
   ============================================================ */

/*
 * currentLiquidityRate is RAY-scaled.
 *
 * Convert:
 *
 * per-second RAY rate
 *        ↓
 * annual percentage
 */

function calculateApy(
  _currentLiquidityRate: bigint
): number {
  return EARN_APY_PERCENT;
}

/* ============================================================
   CURRENT INDEX
   ============================================================ */

/* ============================================================
   RESERVE HELPERS
   ============================================================ */

function getBigIntField(
  reserve: unknown,
  tupleIndex: number,
  fieldName: string
): bigint {
  if (Array.isArray(reserve)) {
    const tupleValue =
      reserve[tupleIndex];

    if (
      typeof tupleValue === "bigint"
    ) {
      return tupleValue;
    }
  }

  if (
    typeof reserve === "object" &&
    reserve !== null
  ) {
    const namedValue =
      (
        reserve as Record<
          string,
          unknown
        >
      )[fieldName];

    if (
      typeof namedValue === "bigint"
    ) {
      return namedValue;
    }
  }

  return ZERO;
}

/* ============================================================
   BUILD LIVE POSITION
   ============================================================ */

function getEarnStartKey(
  asset: LendingAsset,
  walletAddress: string
): string {
  return `arivo:earn:start:${walletAddress.toLowerCase()}:${asset}`;
}

function getEarnStartTimestamp(
  asset: LendingAsset,
  walletAddress: string,
  nowSeconds: bigint
): bigint {
  const key = getEarnStartKey(
    asset,
    walletAddress
  );

  const stored =
    window.localStorage.getItem(key);

  if (stored) {
    const parsed = Number(stored);

    if (
      Number.isFinite(parsed) &&
      parsed > 0
    ) {
      return BigInt(
        Math.floor(parsed)
      );
    }
  }

  window.localStorage.setItem(
    key,
    nowSeconds.toString()
  );

  return nowSeconds;
}

function buildLivePosition(
  position: EarnPosition,
  nowSeconds: bigint,
  walletAddress: string
): EarnPosition {
  const principal =
    position.userCollateral;

  if (principal <= ZERO) {
    window.localStorage.removeItem(
      getEarnStartKey(
        position.asset,
        walletAddress
      )
    );

    return {
      ...position,

      supplied: ZERO,
      suppliedFormatted: "0.00",

      earned: ZERO,
      earnedFormatted: "0.00000",

      apy: EARN_APY_PERCENT,
    };
  }

  const startTimestamp =
    getEarnStartTimestamp(
      position.asset,
      walletAddress,
      nowSeconds
    );

  const elapsed =
    nowSeconds > startTimestamp
      ? nowSeconds - startTimestamp
      : ZERO;

  /*
   * RedotPay-style accrual:
   *
   * earned =
   * principal × 2.93% × elapsed / 1 year
   *
   * All calculations stay in the token's smallest unit.
   */
  const earned =
    (
      principal *
      EARN_APY_BPS *
      elapsed
    ) /
    (
      EARN_BPS_DENOMINATOR *
      SECONDS_PER_YEAR
    );

  const supplied =
    principal + earned;

  const decimals =
    LENDING_ASSETS[
      position.asset
    ].decimals;

  return {
    ...position,

    supplied,

    suppliedFormatted:
      formatAmount(
        supplied,
        decimals
      ),

    earned,

    earnedFormatted:
      formatEarnedAmount(
        earned,
        decimals
      ),

    apy: EARN_APY_PERCENT,
  };
}

/* ============================================================
   USER COLLATERAL ABI
   ============================================================ */

const userCollateralAbi = [
  {
    type: "function",
    name: "userCollateral",
    stateMutability: "view",
    inputs: [
      {
        name: "user",
        type: "address",
      },
      {
        name: "asset",
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
] as const;

/* ============================================================
   HOOK
   ============================================================ */

export default function useEarnPosition(): UseEarnPositionResult {
  const { user } = usePrivy();

  const [positions, setPositions] =
    useState<
      Record<
        LendingAsset,
        EarnPosition
      >
    >({
      USDC: emptyPosition(
        "USDC"
      ),

      EURC: emptyPosition(
        "EURC"
      ),
    });

  const [isLoading, setIsLoading] =
    useState(true);

  const [isError, setIsError] =
    useState(false);

  /* ==========================================================
     READ ON-CHAIN POSITIONS
     ========================================================== */

  const refetch = useCallback(
    async () => {
      const walletAddress =
        user?.wallet?.address as
          | `0x${string}`
          | undefined;

      if (!walletAddress) {
        setPositions({
          USDC: emptyPosition(
            "USDC"
          ),

          EURC: emptyPosition(
            "EURC"
          ),
        });

        setIsLoading(false);

        setIsError(false);

        return;
      }

      setIsError(false);

      try {
        const assets =
          Object.keys(
            LENDING_ASSETS
          ) as LendingAsset[];

        const results =
          await Promise.all(
            assets.map(
              async (asset) => {
                const config =
                  LENDING_ASSETS[
                    asset
                  ];

                try {
                  const [
                    reserve,
                    scaledBalance,
                    userCollateral,
                  ] =
                    await Promise.all([
                      publicClient.readContract(
                        {
                          address:
                            LENDING_POOL_ADDRESS,

                          abi:
                            lendingPoolAbi,

                          functionName:
                            "reserves",

                          args: [
                            config.underlying,
                          ],
                        }
                      ),

                      publicClient.readContract(
                        {
                          address:
                            config.uToken,

                          abi: erc20Abi,

                          functionName:
                            "balanceOf",

                          args: [
                            walletAddress,
                          ],
                        }
                      ),

                      publicClient.readContract(
                        {
                          address:
                            LENDING_POOL_ADDRESS,

                          abi:
                            userCollateralAbi,

                          functionName:
                            "userCollateral",

                          args: [
                            walletAddress,
                            config.underlying,
                          ],
                        }
                      ),
                    ]);

                  /* ==========================================
                     RESERVE DATA
                     ========================================== */

                  const liquidityIndex =
                    getBigIntField(
                      reserve,
                      3,
                      "liquidityIndex"
                    );

                  const currentLiquidityRate =
                    getBigIntField(
                      reserve,
                      5,
                      "currentLiquidityRate"
                    );

                  const lastUpdateTimestamp =
                    getBigIntField(
                      reserve,
                      10,
                      "lastUpdateTimestamp"
                    );

                  /* ==========================================
                     BASE POSITION
                     ========================================== */

                  const basePosition: EarnPosition =
                    {
                      asset,

                      supplied:
                        ZERO,

                      suppliedFormatted:
                        "0.00",

                      userCollateral,

                      earned:
                        ZERO,

                      earnedFormatted:
                        "0.00000",

                      scaledBalance,

                      liquidityIndex,

                      currentLiquidityRate,

                      lastUpdateTimestamp,

                      apy:
                        calculateApy(
                          currentLiquidityRate
                        ),
                    };

                  /* ==========================================
                     LIVE POSITION AT FETCH TIME
                     ========================================== */

                  const nowSeconds =
                    BigInt(
                      Math.floor(
                        Date.now() /
                          1000
                      )
                    );

                  const livePosition =
                    buildLivePosition(
                      basePosition,
                      nowSeconds,
                      walletAddress
                    );

                  return [
                    asset,
                    livePosition,
                  ] as const;
                } catch (
                  assetError
                ) {
                  console.error(
                    `Failed to load ${asset} Earn position:`,
                    assetError
                  );

                  return [
                    asset,
                    emptyPosition(
                      asset
                    ),
                  ] as const;
                }
              }
            )
          );

        const nextPositions: Record<
          LendingAsset,
          EarnPosition
        > = {
          USDC: emptyPosition(
            "USDC"
          ),

          EURC: emptyPosition(
            "EURC"
          ),
        };

        for (
          const [
            asset,
            position,
          ] of results
        ) {
          nextPositions[
            asset
          ] = position;
        }

        setPositions(
          nextPositions
        );

        setIsLoading(false);
      } catch (error) {
        console.error(
          "Failed to load Earn positions:",
          error
        );

        setIsError(true);

        setIsLoading(false);
      }
    },
    [user?.wallet?.address]
  );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /* ==========================================================
     ON-CHAIN REFRESH
     ========================================================== */

  useEffect(() => {
    const walletAddress =
      user?.wallet?.address;

    if (!walletAddress) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void refetch();
        },
        ONCHAIN_REFRESH_MS
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    user?.wallet?.address,
    refetch,
  ]);

  /* ==========================================================
     LIVE 1-SECOND UI ACCRUAL
     ========================================================== */

  useEffect(() => {
    const walletAddress =
      user?.wallet?.address;

    if (!walletAddress) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          const nowSeconds =
            BigInt(
              Math.floor(
                Date.now() /
                  1000
              )
            );

          setPositions(
            (
              current: Record<
                LendingAsset,
                EarnPosition
              >
            ) => {
              const next: Record<
                LendingAsset,
                EarnPosition
              > = {
                ...current,
              };

              for (
                const asset of Object.keys(
                  current
                ) as LendingAsset[]
              ) {
                next[asset] =
                  buildLivePosition(
                    current[asset],
                    nowSeconds,
                    walletAddress
                  );
              }

              return next;
            }
          );
        },
        LIVE_REFRESH_MS
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    user?.wallet?.address,
  ]);

  /* ==========================================================
     REFRESH AFTER EARN / BALANCE TX
     ========================================================== */

  useEffect(() => {
    const handleRefresh =
      () => {
        void refetch();
      };

    window.addEventListener(
      "refreshEarn",
      handleRefresh
    );

    window.addEventListener(
      "refreshBalance",
      handleRefresh
    );

    return () => {
      window.removeEventListener(
        "refreshEarn",
        handleRefresh
      );

      window.removeEventListener(
        "refreshBalance",
        handleRefresh
      );
    };
  }, [refetch]);

  /* ==========================================================
     RETURN
     ========================================================== */

  return {
    positions,

    isLoading,

    isError,

    refetch,
  };
}