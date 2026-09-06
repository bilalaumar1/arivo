export const LENDING_CHAIN_ID = 5042002 as const;

export const LENDING_POOL_ADDRESS =
  "0xb6cBD47e67DeF8270916A9F756526015Fabb2f1B" as const;

export const LENDING_ASSETS = {
  USDC: {
    symbol: "USDC",
    decimals: 6,
    underlying:
      "0x3600000000000000000000000000000000000000",
    uToken:
      "0xbab299155CDC34b790e2d96DdadC3Ac64708C003",
  },
  EURC: {
    symbol: "EURC",
    decimals: 6,
    underlying:
      "0x89b50855aa3be2f677cd6303cec089b5f319d72a",
    uToken:
      "0x6bdaa941dE3D01b97B6010b2e5eFd6439ec8D2c6",
  },
} as const;

export type LendingAsset =
  keyof typeof LENDING_ASSETS;