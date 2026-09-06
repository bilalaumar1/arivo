export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
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
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },
] as const;

export const lendingPoolAbi = [
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "asset",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "onBehalfOf",
        type: "address",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "asset",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "to",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "withdrawn",
        type: "uint256",
      },
    ],
  },
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
  {
    type: "function",
    name: "reserves",
    stateMutability: "view",
    inputs: [
      {
        name: "asset",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "uToken",
        type: "address",
      },
      {
        name: "debtToken",
        type: "address",
      },
      {
        name: "underlyingAsset",
        type: "address",
      },
      {
        name: "liquidityIndex",
        type: "uint256",
      },
      {
        name: "variableBorrowIndex",
        type: "uint256",
      },
      {
        name: "currentLiquidityRate",
        type: "uint256",
      },
      {
        name: "currentBorrowRate",
        type: "uint256",
      },
      {
        name: "totalLiquidity",
        type: "uint256",
      },
      {
        name: "totalBorrows",
        type: "uint256",
      },
      {
        name: "reserveBalance",
        type: "uint256",
      },
      {
        name: "lastUpdateTimestamp",
        type: "uint256",
      },
      {
        name: "active",
        type: "bool",
      },
      {
        name: "frozen",
        type: "bool",
      },
    ],
  },
] as const;