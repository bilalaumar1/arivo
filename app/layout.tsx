import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { ToastProvider } from "@/components/toast/ToastProvider";
import IncomingPaymentWatcher from "@/components/settings/IncomingPaymentWatcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arivo",
  description: "Global USDC Accounts",
  icons: {
  icon: "/arivo-favicon.png",
  shortcut: "/arivo-favicon.png",
  apple: "/arivo-favicon.png",
},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <Providers>
            <IncomingPaymentWatcher />
            {children}
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}