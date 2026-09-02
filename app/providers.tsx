"use client";

import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";
import { ToastProvider } from "@/components/toast/ToastProvider";

const ARC_TESTNET = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export default function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "wallet"],

        defaultChain: ARC_TESTNET,

        supportedChains: [ARC_TESTNET],

        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },

        appearance: {
          theme: "dark",
          accentColor: "#E6DDCD",
          logo: "/arivo-icon.png",
        },
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </PrivyProvider>
  );
}