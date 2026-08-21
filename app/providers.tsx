"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

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

        appearance: {
          theme: "dark",
          accentColor: "#E6DDCD",
          logo: "/arivo-icon.png",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}