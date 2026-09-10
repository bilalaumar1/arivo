"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useI18n } from "@/lib/i18n/useI18n";
import { useToast } from "@/components/toast/ToastProvider";
import type { LucideIcon } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { sendUSDC } from "@/lib/sendUSDC";
import { sendEURC } from "@/lib/sendEURC";
import { publicClient } from "@/lib/publicClient";
import { formatUnits } from "viem";
import { createArivoOrder, updateArivoOrder } from "@/lib/orderStore";
import { fulfillGiftCardOrder } from "@/lib/giftCardFulfillment";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Gift,
  Mail,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
  Zap,
} from "lucide-react";

type ServiceId = "electricity" | "water" | "internet" | "mobile" | "giftcards";
type PaymentAsset = "USDC" | "EURC";

type Service = {
  id: ServiceId;
  title: string;
  description: string;
  group: string;
  icon: LucideIcon;
};

type CountryId = "dz" | "us" | "fr" | "gb" | "ae";

type CountryConfig = {
  name: string;
  currency: string;
  symbol: string;
  mobileAmounts: number[];
};

const services: Service[] = [
  {
    id: "electricity",
    title: "Electricity",
    description:
      "Enter the amount shown on your bill, then review the payment before confirming.",
    group: "Bills",
    icon: Zap,
  },
  {
    id: "water",
    title: "Water",
    description:
      "Enter the amount shown on your water bill, then review the payment before confirming.",
    group: "Bills",
    icon: Receipt,
  },
  {
    id: "internet",
    title: "Internet",
    description:
      "Choose an internet plan and review the selected offer before payment.",
    group: "Bills",
    icon: Wifi,
  },
  {
    id: "mobile",
    title: "Mobile recharge",
    description:
      "Choose a local recharge amount for the selected country and operator.",
    group: "Recharge",
    icon: Smartphone,
  },
  {
    id: "giftcards",
    title: "Gift cards",
    description:
      "Choose a digital card and receive the delivery details after payment.",
    group: "Digital",
    icon: Gift,
  },
];

const countries: Record<CountryId, CountryConfig> = {
  dz: {
    name: "Algeria",
    currency: "DZD",
    symbol: "دج",
    mobileAmounts: [100, 500, 1000, 2000, 5000],
  },
  us: {
    name: "United States",
    currency: "USD",
    symbol: "$",
    mobileAmounts: [5, 10, 20, 50],
  },
  fr: {
    name: "France",
    currency: "EUR",
    symbol: "€",
    mobileAmounts: [5, 10, 20, 50],
  },
  gb: {
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    mobileAmounts: [5, 10, 20, 50],
  },
  ae: {
    name: "United Arab Emirates",
    currency: "AED",
    symbol: "AED",
    mobileAmounts: [20, 50, 100, 200],
  },
};

const internetPlans = [
  {
    id: "1m",
    label: "1 month",
    price: 5,
  },
  {
    id: "3m",
    label: "3 months",
    price: 12,
  },
  {
    id: "1y",
    label: "1 year",
    price: 50,
  },
] as const;

const giftCardCatalog = {
  Netflix: [
    { id: "5", label: "$5", price: 5 },
    { id: "10", label: "$10", price: 10 },
    { id: "25", label: "$25", price: 25 },
    { id: "50", label: "$50", price: 50 },
  ],
  "Google Play": [
    { id: "10", label: "$10", price: 10 },
    { id: "25", label: "$25", price: 25 },
    { id: "50", label: "$50", price: 50 },
    { id: "100", label: "$100", price: 100 },
  ],
  Apple: [
    { id: "10", label: "$10", price: 10 },
    { id: "25", label: "$25", price: 25 },
    { id: "50", label: "$50", price: 50 },
    { id: "100", label: "$100", price: 100 },
  ],
  Steam: [
    { id: "5", label: "$5", price: 5 },
    { id: "10", label: "$10", price: 10 },
    { id: "20", label: "$20", price: 20 },
    { id: "50", label: "$50", price: 50 },
  ],
} as const;

const giftCardBrands = Object.keys(giftCardCatalog) as Array<keyof typeof giftCardCatalog>;

const inputClass =
  "h-12 w-full rounded-xl border border-[#303030] bg-[#202020] px-4 text-[13px] text-white outline-none transition placeholder:text-zinc-600 focus:border-[#efe5d2] focus:bg-[#222222]";

function AssetLogo({ asset }: { asset: PaymentAsset }) {


  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#242424]">
      <img
        src={asset === "USDC" ? "/usdc-logo.png" : "/eurc-logo.png"}
        alt={asset}
        className="h-7 w-7 object-contain"
      />
    </div>
  );
}

export default function MerchantPage() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();

  const [selectedService, setSelectedService] =
    useState<ServiceId | null>(null);

  const [paymentStep, setPaymentStep] =
    useState<"details" | "payment">("details");

  const [paymentAsset, setPaymentAsset] =
    useState<PaymentAsset>("USDC");

  const [country, setCountry] = useState<CountryId>("dz");
  const [identifier, setIdentifier] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [billAmount, setBillAmount] = useState("");

  const [internetPlan, setInternetPlan] =
    useState<(typeof internetPlans)[number]["id"]>("1m");

  const [giftBrand, setGiftBrand] = useState<keyof typeof giftCardCatalog>("Netflix");
  const [giftPlan, setGiftPlan] = useState("5");

  const [mobileAmount, setMobileAmount] =
    useState<number>(countries.dz.mobileAmounts[0]);

  const [fxRates, setFxRates] = useState<Record<string, number> | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState("");

  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [networkFee, setNetworkFee] = useState("0.000000");
  const [confirmedAt, setConfirmedAt] = useState("");
  const [orderId, setOrderId] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [emailError, setEmailError] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");


  const paymentReceiver =
    process.env.NEXT_PUBLIC_ARIVO_PAY_RECEIVER ?? "";

  const current = useMemo(
    () =>
      services.find((service) => service.id === selectedService) ?? null,
    [selectedService]
  );

  const countryConfig = countries[country];
  const serviceTitle = (id: ServiceId) =>
    ({
      electricity: t("merchant", "electricity"),
      water: t("merchant", "water"),
      internet: t("merchant", "internet"),
      mobile: t("merchant", "mobileRecharge"),
      giftcards: t("merchant", "giftCards"),
    })[id];

  const serviceDescription = (id: ServiceId) =>
    ({
      electricity: t("merchant", "electricityDescription"),
      water: t("merchant", "waterDescription"),
      internet: t("merchant", "internetDescription"),
      mobile: t("merchant", "mobileDescription"),
      giftcards: t("merchant", "giftCardsDescription"),
    })[id];

  const serviceGroup = (group: string) =>
    ({
      Bills: t("merchant", "bills"),
      Recharge: t("merchant", "recharge"),
      Digital: t("merchant", "digital"),
    }[group] ?? group);

  const countryName = (id: CountryId) =>
    ({
      dz: t("merchant", "algeria"),
      us: t("merchant", "unitedStates"),
      fr: t("merchant", "france"),
      gb: t("merchant", "unitedKingdom"),
      ae: t("merchant", "unitedArabEmirates"),
    })[id];

  const internetPlanLabel = (id: (typeof internetPlans)[number]["id"]) =>
    ({
      "1m": t("merchant", "oneMonth"),
      "3m": t("merchant", "threeMonths"),
      "1y": t("merchant", "oneYear"),
    })[id];


  const selectedInternetPlan =
    internetPlans.find((plan) => plan.id === internetPlan) ??
    internetPlans[0];

  const giftCardPlans = giftCardCatalog[giftBrand];
  const selectedGiftPlan =
    giftCardPlans.find((plan) => plan.id === giftPlan) ??
    giftCardPlans[0];

  const orderPrice = useMemo(() => {
    if (selectedService === "electricity" || selectedService === "water") {
      const amount = Number(billAmount);
      return Number.isFinite(amount) && amount > 0
        ? `${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${countryConfig.currency}`
        : "Enter bill amount";
    }

    if (selectedService === "internet") {
      return `$${selectedInternetPlan.price.toFixed(2)}`;
    }

    if (selectedService === "giftcards") {
      return `$${selectedGiftPlan.price.toFixed(2)}`;
    }

    if (selectedService === "mobile") {
      const localValue = mobileAmount.toLocaleString();
      return `${localValue} ${countryConfig.currency}`;
    }

    return "—";
  }, [
    selectedService,
    billAmount,
    countryConfig.currency,
    selectedInternetPlan.price,
    selectedGiftPlan.price,
    mobileAmount,
  ]);

  const serviceAmount = useMemo(() => {
    if (selectedService === "electricity" || selectedService === "water") {
      const amount = Number(billAmount);
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    }

    if (selectedService === "internet") {
      return selectedInternetPlan.price;
    }

    if (selectedService === "giftcards") {
      return selectedGiftPlan.price;
    }

    if (selectedService === "mobile") {
      return mobileAmount;
    }

    return null;
  }, [
    selectedService,
    billAmount,
    selectedInternetPlan.price,
    selectedGiftPlan.price,
    mobileAmount,
  ]);

  const serviceCurrency =
    selectedService === "electricity" ||
    selectedService === "water" ||
    selectedService === "mobile"
      ? countryConfig.currency
      : "USD";

  useEffect(() => {
    const controller = new AbortController();

    async function loadFx() {
      if (serviceAmount === null) {
        setFxRates(null);
        setFxError("");
        return;
      }

      try {
        setFxLoading(true);
        setFxError("");

        const response = await fetch(
          "https://open.er-api.com/v6/latest/USD",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(t("merchant", "unableToLoadRates"));
        }

        const data = await response.json();
        if (!data?.rates || typeof data.rates !== "object") {
          throw new Error(t("merchant", "rateDataUnavailable"));
        }

        setFxRates(data.rates as Record<string, number>);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("FX rate lookup failed:", error);
        setFxRates(null);
        setFxError(t("merchant", "currentRateUnavailable"));
      } finally {
        if (!controller.signal.aborted) {
          setFxLoading(false);
        }
      }
    }

    loadFx();

    return () => controller.abort();
  }, [serviceAmount, serviceCurrency]);

  const paymentEquivalents = useMemo(() => {
    if (serviceAmount === null || !fxRates) return null;

    const localRate =
      serviceCurrency === "USD"
        ? 1
        : Number(fxRates[serviceCurrency]);

    const eurRate = Number(fxRates.EUR);

    if (!Number.isFinite(localRate) || localRate <= 0) {
      return null;
    }

    const amountUsd = serviceAmount / localRate;

    return {
      USDC: amountUsd,
      EURC:
        Number.isFinite(eurRate) && eurRate > 0
          ? amountUsd * eurRate
          : 0,
    };
  }, [serviceAmount, serviceCurrency, fxRates]);

  function openCheckout(serviceId: ServiceId) {
    setSelectedService(serviceId);
    setPaymentStep("details");
    setPaymentAsset("USDC");
    setIdentifier("");
    setAddress("");
    setEmail("");
    setBillAmount("");
    setEmailStatus("idle");
    setEmailError("");
    setGiftCardCode("");

    if (serviceId === "mobile") {
      setMobileAmount(countries[country].mobileAmounts[0]);
    }
  }

  function closeCheckout() {
    setSelectedService(null);
    setPaymentStep("details");
    setIdentifier("");
    setAddress("");
    setEmail("");
    setBillAmount("");
  }

  function changeCountry(value: CountryId) {
    setCountry(value);
    setMobileAmount(countries[value].mobileAmounts[0]);
  }

  function canContinue() {
    if (!selectedService) return false;

    if (selectedService === "electricity" || selectedService === "water") {
      return (
        identifier.trim().length > 0 &&
        address.trim().length > 0 &&
        email.trim().length > 0 &&
        Number(billAmount) > 0
      );
    }

    if (selectedService === "internet") {
      return (
        identifier.trim().length > 0 &&
        email.trim().length > 0
      );
    }

    if (selectedService === "mobile") {
      return identifier.trim().length > 0;
    }

    return email.trim().length > 0;
  }

  function continueToPayment() {
    if (!canContinue()) return;
    setPaymentStep("payment");
  }

  async function handlePay() {
    if (!current) return;

    setPaymentError("");

    if (!paymentReceiver) {
      const message =
        t("merchant", "paymentSetupError");
      setPaymentError(message);
      toastError("Payment setup required", message);
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(paymentReceiver)) {
      const message = t("merchant", "invalidReceiver");
      setPaymentError(message);
      toastError("Payment failed", message);
      return;
    }

    if (!paymentEquivalents) {
      const message =
        t("merchant", "quoteUnavailable");
      setPaymentError(message);
      toastError(t("merchant", "quoteUnavailableTitle"), message);
      return;
    }

    const amount = paymentEquivalents[paymentAsset];

    if (!Number.isFinite(amount) || amount <= 0) {
      const message = t("merchant", "invalidPaymentAmount");
      setPaymentError(message);
      toastError("Payment failed", message);
      return;
    }

    setPaying(true);

    try {
      let hash: string;

      const amountForToken = amount.toFixed(6);
      const receiver =
        paymentReceiver as `0x${string}`;

      // Use the wallet managed by Privy for email / Google users instead of
      // falling back to window.ethereum (MetaMask). This keeps Merchant
      // payments on the same Arivo wallet shown in the dashboard.
      const activeWallet = wallets.find(
        (wallet) =>
          wallet.address.toLowerCase() ===
          user?.wallet?.address?.toLowerCase()
      );

      if (!activeWallet) {
        throw new Error(
          t("merchant", "walletNotFound")
        );
      }

      const transactionProvider =
        (await activeWallet.getEthereumProvider()) as unknown as Parameters<
          typeof sendUSDC
        >[2];

      if (paymentAsset === "USDC") {
        hash = await sendUSDC(
          receiver,
          amountForToken,
          transactionProvider
        );
      } else {
        hash = await sendEURC(
          receiver,
          amountForToken,
          transactionProvider
        );
      }

      setTxHash(hash);

      const receipt =
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.effectiveGasPrice;

      if (gasUsed !== undefined && gasPrice !== undefined) {
        setNetworkFee(
          Number(
            formatUnits(gasUsed * gasPrice, 18)
          ).toFixed(6)
        );
      }

      setConfirmedAt(
        new Date().toLocaleString()
      );

      const createdOrder = createArivoOrder({
        service: current.id as
          | "electricity"
          | "internet"
          | "mobile"
          | "giftcards",
        serviceName:
          current.id === "giftcards"
            ? `${giftBrand} Gift Card`
            : current.title,
        email,
        ownerWalletAddress: user?.wallet?.address?.toLowerCase() ?? "",
        country:
          selectedService === "electricity" ||
          selectedService === "water" ||
          selectedService === "mobile"
            ? countryConfig.name
            : undefined,
        localCurrency:
          selectedService === "electricity" ||
          selectedService === "water" ||
          selectedService === "mobile"
            ? countryConfig.currency
            : "USD",
        localAmount: serviceAmount ?? undefined,
        localAmountFormatted: orderPrice,
        paymentAsset,
        cryptoAmount: amount,
        transactionHash: hash,
        paymentReceiver,
        network: "Arc Testnet",
        status: "payment_confirmed",
        fulfillmentNote:
          current.id === "giftcards"
            ? "Payment confirmed. Waiting for gift-card provider fulfillment."
            : current.id === "electricity"
              ? "Payment confirmed. Waiting for electricity provider fulfillment."
              : current.id === "internet"
                ? "Payment confirmed. Waiting for internet provider fulfillment."
                : "Payment confirmed. Waiting for recharge provider fulfillment.",
      });

      setOrderId(createdOrder.id);

      if (current.id === "giftcards") {
        try {
          const fulfillment = await fulfillGiftCardOrder(createdOrder);

          if (fulfillment.code) {
            setGiftCardCode(fulfillment.code);

            updateArivoOrder(createdOrder.id, {
              status: "fulfilled",
              fulfillmentNote:
                `Gift card fulfilled and delivered to ${email}.`,
            });
          } else {
            updateArivoOrder(createdOrder.id, {
              status: "processing",
              fulfillmentNote:
                `Payment confirmed. Gift card is still processing.`,
            });
          }
        } catch (fulfillmentError) {
          console.error(
            "Gift card fulfillment failed:",
            fulfillmentError
          );

          updateArivoOrder(createdOrder.id, {
            status: "processing",
            fulfillmentNote:
              "Payment confirmed. Gift card fulfillment is still processing.",
          });
        }
      }

      // Send the payment confirmation email after the blockchain payment
      // has been confirmed. Email failure must NOT mark the payment failed.
      setEmailStatus("sending");
      setEmailError("");

      try {
        const emailResponse = await fetch("/api/orders/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order: createdOrder,
          }),
        });

        const emailResult = await emailResponse.json().catch(() => ({}));

        if (!emailResponse.ok) {
          throw new Error(
            emailResult?.error ||
              t("merchant", "emailNotSentError")
          );
        }

        setEmailStatus("sent");

        updateArivoOrder(createdOrder.id, {
          fulfillmentNote:
            `${createdOrder.fulfillmentNote} Payment confirmation email sent to ${email}.`,
        });
      } catch (emailError) {
        console.error("Order email failed:", emailError);
        setEmailStatus("failed");
        setEmailError(
          emailError instanceof Error
            ? emailError.message
            : t("merchant", "emailDeliveryFailed")
        );
      }

      setPaymentSuccess(true);
      setPaymentError("");

      success(
        "Payment confirmed",
        `${amount.toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })} ${paymentAsset} payment confirmed on Arc Testnet.`
      );

      window.dispatchEvent(
        new Event("refreshBalance")
      );

      window.dispatchEvent(
        new Event("refreshTransactions")
      );
    } catch (error) {
      console.error("Arivo Pay transaction failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : t("merchant", "paymentFailed");

      setPaymentError(message);
      toastError("Payment failed", message);
    } finally {
      setPaying(false);
    }
  }

  function closeSuccess() {
    if (paying) return;

    setPaymentSuccess(false);
    setTxHash("");
    setNetworkFee("0.000000");
    setConfirmedAt("");
    setPaymentError("");
    setOrderId("");
    setEmailStatus("idle");
    setEmailError("");
    setGiftCardCode("");
    closeCheckout();
  }

  function printReceipt() {
    window.print();
  }

  function openExplorer() {
    if (!txHash) return;

    window.open(
      `https://testnet.arcscan.app/tx/${txHash}`,
      "_blank",
      "noopener,noreferrer"
    );
  }


  return (
    <div className="flex min-h-screen bg-[#0f1011] text-white">
      <Sidebar />

      <main className="relative z-0 min-w-0 flex-1 overflow-x-hidden">
        <header className="flex h-[88px] items-center justify-between border-b border-[#292929] px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
              aria-label={t("common", "back")}
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-[26px] font-semibold">
                Arivo Pay
              </h1>
              <p className="mt-1 whitespace-nowrap text-[13px] text-zinc-500">
                {t("merchant", "headerSubtitle")}
              </p>
            </div>
          </div>

          <Topbar variant="actions" />
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1180px]">
            <section className="relative min-h-[245px] overflow-hidden rounded-[24px] border border-[#202a38] bg-[radial-gradient(circle_at_72%_35%,rgba(83,123,177,0.32),transparent_26%),radial-gradient(circle_at_82%_75%,rgba(31,58,91,0.34),transparent_38%),linear-gradient(105deg,#0b1117_0%,#0d141c_42%,#111c2a_72%,#0a1016_100%)] px-6 py-8 sm:px-8 sm:py-9 lg:min-h-[245px] lg:px-10 lg:py-10">
              <div className="pointer-events-none absolute -right-[115px] -top-[125px] h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle_at_28%_28%,rgba(126,165,214,0.48),rgba(38,67,103,0.25)_34%,rgba(8,15,23,0.95)_68%)] shadow-[-35px_0_90px_rgba(56,93,137,0.22)]" />
              <div className="pointer-events-none absolute right-[7%] -top-[25px] h-[340px] w-[340px] rounded-full border border-white/[0.05]" />
              <div className="pointer-events-none absolute right-[15%] -top-[80px] h-[330px] w-[330px] rounded-full border border-[#6f91b8]/[0.08]" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(90deg,transparent,rgba(4,10,17,0.12)_45%,rgba(3,8,14,0.48))]" />

              <div className="relative z-10 flex min-h-[181px] items-center justify-between gap-8">
                <div className="max-w-[570px]">
                  <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#8795a8]">
                    ARIVO PAY
                  </p>
                  <h2 className="mt-4 max-w-[540px] text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[42px] lg:text-[46px]">
                    Everyday services,
                    <br />
                    <span className="text-[#b9cbed]">{t("merchant", "simplified")}</span>
                  </h2>
                  <p className="mt-4 max-w-[430px] text-[13px] leading-5 text-[#9aa6b5] sm:text-[14px]">
                    {t("merchant", "heroLine1")}
                    <br className="hidden sm:block" />
                    {t("merchant", "heroLine2")}
                  </p>
                </div>

                <div className="relative z-10 hidden shrink-0 pr-4 sm:block lg:pr-8">
                  <p className="text-[17px] leading-[1.45] text-[#c4cfdf]">
                    Fast.
                    <br />
                    Secure.
                    <br />
                    On-chain.
                  </p>
                  <div className="mt-4 h-px w-8 bg-[#c4cfdf]" />
                </div>
              </div>
            </section>

            <section className="mt-5">
              <div className="flex h-[54px] items-center rounded-2xl border border-[#2d3033] bg-[#17191a] px-4 transition focus-within:border-[#55595d]">
                <input
                  type="text"
                  aria-label={t("merchant", "searchServices")}
                  placeholder={t("merchant", "searchPlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  className="ml-3 hidden h-9 shrink-0 rounded-full bg-[#efe5d2] px-5 text-[12px] font-semibold text-black transition hover:bg-white sm:block"
                >
                  Search
                </button>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{t("merchant", "popular")}</h3>
                  <p className="mt-1 text-[12px] text-zinc-500">{t("merchant", "popularDescription")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("all-services")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-[12px] font-medium text-zinc-400 transition hover:text-white"
                >
                  See all
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {services.slice(0, 3).map((service, index) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => openCheckout(service.id)}
                    className={`group relative min-h-[126px] overflow-hidden rounded-[22px] border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#4a4d51] ${
                      index === 0
                        ? "border-[#403a30] bg-[linear-gradient(135deg,#282117,#17191a)]"
                        : index === 1
                          ? "border-[#303945] bg-[linear-gradient(135deg,#172231,#17191a)]"
                          : "border-[#293b34] bg-[linear-gradient(135deg,#14251e,#17191a)]"
                    }`}
                  >
                    <div className="absolute -bottom-20 -right-12 h-40 w-40 rounded-full border border-white/[0.05] transition duration-300 group-hover:scale-110" />
                    <div className="relative">
                      <p className="text-[15px] font-semibold">{serviceTitle(service.id)}</p>
                      <p className="mt-2 text-[12px] text-zinc-500">
                        {index === 0 ? "Pay your bill" : index === 1 ? "Stay connected" : "Top up your balance"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section id="all-services" className="mt-9 scroll-mt-6">
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{t("merchant", "allServices")}</h3>
                <p className="mt-1 text-[12px] text-zinc-500">{t("merchant", "allServicesDescription")}</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => openCheckout("electricity")}
                  className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-[#303641] bg-[linear-gradient(135deg,#1b2330,#151719)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#4a5260]"
                >
                  <div className="absolute -right-16 -top-16 h-52 w-52 rotate-45 border border-white/[0.05]" />
                  <div className="relative">
                    <p className="text-[17px] font-semibold">{t("merchant", "bills")}</p>
                    <div className="mt-5 space-y-1.5 text-[12px] text-zinc-500">
                      <p>{t("merchant", "electricity")}</p>
                      <p>{t("merchant", "water")}</p>
                      <p>{t("merchant", "internet")}</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openCheckout("mobile")}
                  className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-[#40382d] bg-[linear-gradient(135deg,#292318,#17191a)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#5a4d3c]"
                >
                  <div className="absolute -right-16 top-10 h-56 w-20 rotate-[-38deg] border border-[#a58a5c]/10 bg-[#8c7040]/10" />
                  <div className="relative">
                    <p className="text-[17px] font-semibold">{t("merchant", "mobile")}</p>
                    <div className="mt-4 space-y-1.5 text-[12px] text-zinc-500">
                      <p>{t("merchant", "recharge")}</p>
                      <p>{t("merchant", "dataBundles")}</p>
                      <p>{t("merchant", "voicePlans")}</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openCheckout("giftcards")}
                  className="group relative min-h-[190px] overflow-hidden rounded-[22px] border border-[#393044] bg-[linear-gradient(135deg,#201b29,#17191a)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#56486a]"
                >
                  <div className="absolute -right-20 -top-20 h-56 w-56 border border-[#8c65b8]/10 bg-[#6f4a91]/10" />
                  <div className="relative">
                    <p className="text-[17px] font-semibold">{t("merchant", "digital")}</p>
                    <div className="mt-4 space-y-1.5 text-[12px] text-zinc-500">
                      <p>{t("merchant", "giftCards")}</p>
                      <p>{t("merchant", "gaming")}</p>
                      <p>{t("merchant", "subscriptions")}</p>
                      <p>{t("merchant", "esim")}</p>
                    </div>
                  </div>
                </button>

                <div className="relative min-h-[150px] overflow-hidden rounded-[22px] border border-[#30343a] bg-[linear-gradient(135deg,#1a2027,#151719)] p-5 md:col-span-2">
                  <div className="absolute -bottom-24 left-1/3 h-48 w-[70%] rounded-full border border-white/[0.04]" />
                  <div className="relative max-w-[460px]">
                    <p className="text-[17px] font-semibold">{t("merchant", "comingSoon")}</p>
                    <p className="mt-3 text-[12px] leading-5 text-zinc-500">
                      More everyday services are coming soon to Arivo Pay.
                    </p>
                  </div>
                </div>
              </div>
            </section>
<section className="mt-8 rounded-[22px] border border-[#292c2f] bg-[#141617] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">{t("merchant", "arivoPayUpper")}</p>
                  <h3 className="mt-2 text-[16px] font-semibold">{t("merchant", "paymentAndOrders")}</h3>
                  <p className="mt-1 max-w-[620px] text-[12px] leading-5 text-zinc-500">
                    {t("merchant", "paymentAndOrdersDescription")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => window.location.assign("/orders")}
                    className="h-10 rounded-xl bg-[#efe5d2] px-5 text-[12px] font-semibold text-black transition hover:bg-white"
                  >
                    View orders
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.assign("/transactions")}
                    className="h-10 rounded-xl border border-[#34373a] bg-[#1b1d1e] px-5 text-[12px] text-zinc-300 transition hover:bg-[#242628] hover:text-white"
                  >
                    Transactions
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {current && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[28px] border border-[#333] bg-[#171717] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] px-6 py-5 lg:px-7">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                  {serviceGroup(current.group)}
                </p>
                <h2 className="mt-1 text-[20px] font-semibold">
                  {serviceTitle(current.id)}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-[#242424] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              {current.group === "Bills" && (
                <div className="border-b border-[#2a2a2a] bg-[#141414] px-4 py-3 sm:px-6 lg:px-7">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {(["electricity", "water", "internet"] as ServiceId[]).map(
                      (billService) => {
                        const bill = services.find(
                          (service) => service.id === billService
                        );

                        if (!bill) return null;

                        return (
                          <button
                            key={billService}
                            type="button"
                            onClick={() => {
                              setSelectedService(billService);
                              setPaymentStep("details");
                              setPaymentError("");
                            }}
                            className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-medium transition ${
                              current.id === billService
                                ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                : "border-[#303030] bg-[#1c1c1c] text-zinc-400 hover:border-[#484848] hover:text-white"
                            }`}
                          >
                            {serviceTitle(bill.id)}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
                <div className="border-b border-[#2a2a2a] p-6 lg:border-b-0 lg:border-r lg:p-7">
                  {paymentStep === "details" ? (
                    <>
                      <div className="mb-6">
                        <p className="text-[11px] text-zinc-600">
                          Step 1 of 2
                        </p>

                        <h3 className="mt-1 text-[17px] font-semibold">
                          Service details
                        </h3>

                        <p className="mt-1 text-[12px] text-zinc-500">
                          Use the currency and details normally associated
                          with this service.
                        </p>
                      </div>

                      {(selectedService === "electricity" ||
                        selectedService === "water" ||
                        selectedService === "mobile") && (
                        <div className="mb-5">
                          <label className="mb-2 block text-[12px] text-zinc-400">
                            Country
                          </label>

                          <select
                            value={country}
                            onChange={(e) =>
                              changeCountry(
                                e.target.value as CountryId
                              )
                            }
                            className={inputClass}
                          >
                            {Object.entries(countries).map(
                              ([id, config]) => (
                                <option key={id} value={id}>
                                  {countryName(id as CountryId)} · {config.currency}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}

                      {(current.id === "electricity" ||
                        current.id === "water") && (
                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Customer / contract number
                            </label>

                            <input
                              value={identifier}
                              onChange={(e) =>
                                setIdentifier(e.target.value)
                              }
                              placeholder={
                                current.id === "water"
                                  ? "Enter your water customer number"
                                  : "Enter your customer number"
                              }
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              {current.id === "water"
                                ? "Water bill amount"
                                : "Bill amount"}{" "}
                              · {countryConfig.currency}
                            </label>

                            <div className="relative">
                              <input
                                value={billAmount}
                                onChange={(e) =>
                                  setBillAmount(
                                    e.target.value.replace(
                                      /[^0-9.]/g,
                                      ""
                                    )
                                  )
                                }
                                inputMode="decimal"
                                placeholder={
                                  current.id === "water"
                                    ? "Enter the amount shown on your water bill"
                                    : "Enter the amount shown on your bill"
                                }
                                className={`${inputClass} pr-20`}
                              />

                              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-zinc-500">
                                {countryConfig.currency}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Service address
                            </label>

                            <input
                              value={address}
                              onChange={(e) =>
                                setAddress(e.target.value)
                              }
                              placeholder={
                                current.id === "water"
                                  ? "Full water service address"
                                  : "Full service address"
                              }
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Email for receipt
                            </label>

                            <input
                              value={email}
                              onChange={(e) =>
                                setEmail(e.target.value)
                              }
                              type="email"
                              placeholder={t("merchant", "emailPlaceholder")}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      {current.id === "internet" && (
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Account / line number
                            </label>

                            <input
                              value={identifier}
                              onChange={(e) =>
                                setIdentifier(e.target.value)
                              }
                              placeholder={t("merchant", "accountLinePlaceholder")}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Plan
                            </label>

                            <div className="grid gap-2">
                              {internetPlans.map((plan) => (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() =>
                                    setInternetPlan(plan.id)
                                  }
                                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                                    internetPlan === plan.id
                                      ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                      : "border-[#333] bg-[#202020] text-zinc-300 hover:border-[#444]"
                                  }`}
                                >
                                  <div>
    <p className="text-[13px] font-semibold">
                                      {internetPlanLabel(plan.id)}
                                    </p>
                                    <p
                                      className={`mt-1 text-[10px] ${
                                        internetPlan === plan.id
                                          ? "text-black/60"
                                          : "text-zinc-600"
                                      }`}
                                    >
                                      Internet plan
                                    </p>
                                  </div>

                                  <span className="text-[14px] font-semibold">
                                    ${plan.price.toFixed(2)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Email for receipt
                            </label>

                            <input
                              value={email}
                              onChange={(e) =>
                                setEmail(e.target.value)
                              }
                              type="email"
                              placeholder={t("merchant", "emailPlaceholder")}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      {current.id === "mobile" && (
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Mobile number
                            </label>

                            <input
                              value={identifier}
                              onChange={(e) =>
                                setIdentifier(e.target.value)
                              }
                              placeholder={t("merchant", "mobilePlaceholder")}
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label className="text-[12px] text-zinc-400">
                                Recharge amount
                              </label>

                              <span className="text-[10px] text-zinc-600">
                                {countryConfig.currency}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {countryConfig.mobileAmounts.map(
                                (amount) => (
                                  <button
                                    key={amount}
                                    type="button"
                                    onClick={() =>
                                      setMobileAmount(amount)
                                    }
                                    className={`rounded-xl border px-3 py-3 text-[12px] font-semibold transition ${
                                      mobileAmount === amount
                                        ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                        : "border-[#333] bg-[#202020] text-zinc-400 hover:border-[#444] hover:text-white"
                                    }`}
                                  >
                                    {countryConfig.symbol}{" "}
                                    {amount.toLocaleString()}
                                  </button>
                                )
                              )}
                            </div>

                            {country === "dz" && (
                              <p className="mt-3 text-[10px] text-zinc-600">
                                Reference display: 100 DZD ≈ $0.80. Final
                                payment conversion should use the current
                                checkout quote.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {current.id === "giftcards" && (
                        <div className="space-y-5">
                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Gift card
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              {giftCardBrands.map((brand) => (
                                <button
                                  key={brand}
                                  type="button"
                                  onClick={() => {
                                    setGiftBrand(brand);
                                    setGiftPlan(giftCardCatalog[brand][0].id);
                                  }}
                                  className={`rounded-xl border px-4 py-3 text-left text-[13px] transition ${
                                    giftBrand === brand
                                      ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                      : "border-[#333] bg-[#202020] text-zinc-400 hover:border-[#444] hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{brand}</span>
                                    {giftBrand === brand && (
                                      <Check size={15} />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Available options
                            </label>

                            <div className="grid gap-2">
                              {giftCardPlans.map((plan) => (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() =>
                                    setGiftPlan(plan.id)
                                  }
                                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                                    giftPlan === plan.id
                                      ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                      : "border-[#333] bg-[#202020] text-zinc-300 hover:border-[#444]"
                                  }`}
                                >
                                  <div>
    <p className="text-[13px] font-semibold">
                                      {plan.label}
                                    </p>

                                    <p
                                      className={`mt-1 text-[10px] ${
                                        giftPlan === plan.id
                                          ? "text-black/60"
                                          : "text-zinc-600"
                                      }`}
                                    >
                                      Digital gift card
                                    </p>
                                  </div>

                                  <span className="text-[14px] font-semibold">
                                    ${plan.price.toFixed(2)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Delivery email
                            </label>

                            <div className="relative">
                              <Mail
                                size={16}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                              />

                              <input
                                value={email}
                                onChange={(e) =>
                                  setEmail(e.target.value)
                                }
                                type="email"
                                placeholder={t("merchant", "emailPlaceholder")}
                                className={`${inputClass} pl-11`}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!canContinue()}
                        onClick={continueToPayment}
                        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] text-[13px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Continue to payment
                        <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-6">
                        <p className="text-[11px] text-zinc-600">
                          Step 2 of 2
                        </p>

                        <h3 className="mt-1 text-[19px] font-semibold">
                          Choose how to pay
                        </h3>

                        <p className="mt-1 text-[12px] text-zinc-500">
                          The service price stays in its native currency.
                          USDC and EURC are your payment assets.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {(["USDC", "EURC"] as PaymentAsset[]).map(
                          (asset) => (
                            <button
                              key={asset}
                              type="button"
                              onClick={() =>
                                setPaymentAsset(asset)
                              }
                              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                                paymentAsset === asset
                                  ? "border-[#efe5d2] bg-[#efe5d2] text-black"
                                  : "border-[#333] bg-[#202020] text-white hover:border-[#494949]"
                              }`}
                            >
                              <AssetLogo asset={asset} />

                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold">
                                  {asset}
                                </p>

                                <p
                                  className={`mt-0.5 text-[11px] ${
                                    paymentAsset === asset
                                      ? "text-black/60"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {asset === "USDC"
                                    ? "USD Coin on Arc Testnet"
                                    : "Euro Coin on Arc Testnet"}
                                </p>

                                <div
                                  className={`mt-2 flex items-center gap-2 text-[12px] ${
                                    paymentAsset === asset
                                      ? "text-black"
                                      : "text-zinc-300"
                                  }`}
                                >
                                  <span className="font-semibold">
                                    {fxLoading
                                      ? "Updating…"
                                      : paymentEquivalents
                                        ? `${paymentEquivalents[asset].toLocaleString(
                                            undefined,
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }
                                          )} ${asset}`
                                        : "Rate unavailable"}
                                  </span>

                                  {serviceAmount !== null && (
                                    <span
                                      className={`text-[10px] ${
                                        paymentAsset === asset
                                          ? "text-black/50"
                                          : "text-zinc-600"
                                      }`}
                                    >
                                      current equivalent
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                  paymentAsset === asset
                                    ? "border-black bg-black text-[#efe5d2]"
                                    : "border-[#4a4a4a]"
                                }`}
                              >
                                {paymentAsset === asset && (
                                  <Check size={12} />
                                )}
                              </div>
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-6 rounded-2xl border border-[#2d2d2d] bg-[#202020] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-600">
                            Service
                          </span>
                          <span className="text-[11px] font-medium text-white">
                            {serviceTitle(current.id)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-600">
                            Service price
                          </span>
                          <span className="text-[11px] font-semibold text-white">
                            {orderPrice}
                          </span>
                        </div>

                        {(current.id === "electricity" || current.id === "water") && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-600">
                              Bill account
                            </span>
                            <span className="max-w-[170px] truncate text-[11px] text-zinc-300">
                              {identifier}
                            </span>
                          </div>
                        )}

                        {current.id === "internet" && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-600">
                              Plan
                            </span>
                            <span className="text-[11px] text-zinc-300">
                              {selectedInternetPlan.label}
                            </span>
                          </div>
                        )}

                        {current.id === "giftcards" && (
                          <>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[11px] text-zinc-600">
                                Brand
                              </span>
                              <span className="text-[11px] text-zinc-300">
                                {giftBrand}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[11px] text-zinc-600">
                                Plan
                              </span>
                              <span className="text-[11px] text-zinc-300">
                                {selectedGiftPlan.label}
                              </span>
                            </div>
                          </>
                        )}

                        {current.id === "mobile" && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-600">
                              Country
                            </span>
                            <span className="text-[11px] text-zinc-300">
                              {countryName(country)}
                            </span>
                          </div>
                        )}

                        <div className="mt-4 border-t border-[#303030] pt-4">
                          <p className="text-[10px] leading-5 text-zinc-600">
                            The final USDC/EURC payment quote should be
                            calculated from the current provider rate before
                            the blockchain transaction is submitted.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#303030] bg-[#1c1c1c] px-4 py-3">
                        <ShieldCheck
                          size={15}
                          className="text-green-500"
                        />
                        <span className="text-[11px] text-zinc-400">
                          Arc Testnet · payment confirmation required
                        </span>
                      </div>

                      {paymentError && (
                        <div className="mt-4 rounded-xl border border-[#3a3a3a] bg-[#1c1c1c] px-4 py-3 text-[11px] leading-5 text-zinc-400">
                          {paymentError}
                        </div>
                      )}

                      {!paymentReceiver && (
                        <div className="mt-4 rounded-xl border border-[#3a3a3a] bg-[#1c1c1c] px-4 py-3">
                          <p className="text-[11px] font-medium text-zinc-300">
                            Payment wallet setup required
                          </p>
                          <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                            Configure NEXT_PUBLIC_ARIVO_PAY_RECEIVER in
                            .env.local before sending real funds.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePay}
                        disabled={
                          paying ||
                          fxLoading ||
                          !paymentEquivalents ||
                          !paymentReceiver
                        }
                        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#efe5d2] text-[13px] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {paying
                          ? "Confirming payment..."
                          : !paymentReceiver
                            ? "Payment setup required"
                            : `Pay ${paymentEquivalents
                                ? `${paymentEquivalents[
                                    paymentAsset
                                  ].toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    }
                                  )} ${paymentAsset}`
                                : paymentAsset}`}
                        {!paying && paymentReceiver && (
                          <ArrowRight size={16} />
                        )}
                      </button>
                    </>
                  )}
                </div>

                <aside className="bg-[#141414] p-6 lg:p-7">
                  <div className="sticky top-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                      Order summary
                    </p>

                    <h3 className="mt-2 text-[17px] font-semibold">
                      Review before payment
                    </h3>

                    <div className="mt-5 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Service
                      </p>

                      <p className="mt-1 text-[14px] font-semibold">
                        {serviceTitle(current.id)}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        {serviceDescription(current.id)}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-600">
                          Service price
                        </span>

                        <span className="text-[12px] font-semibold text-white">
                          {orderPrice}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-600">
                          Payment asset
                        </span>

                        <span className="text-[12px] font-semibold text-white">
                          {paymentAsset}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-600">
                          Recipient
                        </span>

                        <span className="max-w-[180px] truncate text-[11px] text-zinc-300">
                          {email || "Provided for checkout"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202020]">
                          <CreditCard
                            size={16}
                            className="text-zinc-400"
                          />
                        </div>

                        <div>
                          <p className="text-[12px] font-medium">
                            Pay in crypto
                          </p>

                          <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                            Your chosen service is priced in its native
                            currency. Arivo will use the current payment
                            quote for USDC or EURC at checkout.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202020]">
                          <ShieldCheck
                            size={17}
                            className="text-zinc-400"
                          />
                        </div>

                        <div>
                          <p className="text-[12px] font-medium">
                            Secure checkout
                          </p>

                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            Provider fulfillment follows blockchain confirmation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>

      )}

      {paymentSuccess && current && (
        <div className="receipt-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm">
          <div className="receipt-card max-h-[calc(100dvh-2rem)] w-full max-w-[420px] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[24px] border border-[#333] bg-[#171717] shadow-2xl lg:max-w-[560px] lg:rounded-[26px]">
            <div className="border-b border-[#2b2b2b] px-4 py-4 text-center lg:px-6 lg:py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <Check
                  size={28}
                  className="text-green-500"
                  strokeWidth={2.5}
                />
              </div>

              <h2 className="mt-4 text-[22px] font-semibold">
                Payment confirmed
              </h2>

              <p className="mt-1 text-[12px] text-zinc-500">
                Your payment has been confirmed on Arc Testnet.
              </p>
            </div>

            <div id="arivo-receipt" className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Arivo Pay
                  </p>
                  <p className="mt-1 text-[15px] font-semibold">
                    Payment receipt
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Order {orderId || "—"}
                  </p>
                </div>

                <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] font-medium text-green-500">
                  CONFIRMED
                </span>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#202020] p-4 lg:mt-5 lg:p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">{t("merchant", "service")}</span>
                  <span className="text-[12px] font-medium text-white">
                    {serviceTitle(current.id)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">
                    Service amount
                  </span>
                  <span className="text-[12px] font-medium text-white">
                    {orderPrice}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">{t("merchant", "paid")}</span>
                  <span className="text-[12px] font-semibold text-white">
                    {paymentEquivalents
                      ? `${paymentEquivalents[paymentAsset].toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          }
                        )} ${paymentAsset}`
                      : paymentAsset}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">
                    Network fee
                  </span>
                  <span className="text-[12px] text-zinc-300">
                    {networkFee} USDC
                  </span>
                </div>

                <div className="h-px bg-[#2d2d2d]" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">{t("merchant", "wallet")}</span>
                  <span className="max-w-[250px] truncate text-[11px] text-zinc-300">
                    {paymentReceiver || "Configured payment wallet"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">{t("merchant", "date")}</span>
                  <span className="text-[11px] text-zinc-300">
                    {confirmedAt}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">
                    Transaction
                  </span>

                  <button
                    type="button"
                    onClick={openExplorer}
                    className="max-w-[300px] truncate text-right text-[11px] text-zinc-300 underline decoration-zinc-700 underline-offset-2 transition hover:text-white"
                  >
                    {txHash}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-zinc-400">
                      Email delivery
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {email || "No email provided"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                      emailStatus === "sent"
                        ? "bg-green-500/10 text-green-400"
                        : emailStatus === "sending"
                          ? "bg-amber-500/10 text-amber-400"
                          : emailStatus === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-zinc-500/10 text-zinc-500"
                    }`}
                  >
                    {emailStatus === "sent"
                      ? "SENT"
                      : emailStatus === "sending"
                        ? "SENDING"
                        : emailStatus === "failed"
                          ? "FAILED"
                          : "NOT SENT"}
                  </span>
                </div>

                {emailError && (
                  <p className="mt-2 text-[10px] leading-5 text-red-300">
                    {emailError}
                  </p>
                )}
              </div>

              {current.id === "giftcards" && giftCardCode && (
                <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                    Gift card code
                  </p>
                  <p className="mt-2 break-all font-mono text-[15px] font-bold tracking-[0.08em] text-white">
                    {giftCardCode}
                  </p>
                  <p className="mt-2 text-[10px] text-green-500">
                    Fulfilled and ready for delivery.
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-[#2d2d2d] bg-[#191919] p-4">
                <p className="text-[10px] font-medium text-zinc-400">
                  Payment confirmed
                </p>
                <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                  {current.id === "giftcards"
                    ? "Gift-card fulfillment is pending provider delivery."
                    : current.id === "electricity"
                      ? "Electricity-bill fulfillment is pending provider confirmation."
                      : current.id === "internet"
                        ? "Internet-service fulfillment is pending provider confirmation."
                        : "Recharge fulfillment is pending provider confirmation."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#2b2b2b] p-5">
              <button
                type="button"
                onClick={printReceipt}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#efe5d2] text-[12px] font-semibold text-black transition hover:bg-white"
              >
                Download PDF
              </button>

              <button
                type="button"
                onClick={openExplorer}
                className="flex h-11 items-center justify-center rounded-xl border border-[#333] bg-[#202020] px-4 text-[12px] text-zinc-300 transition hover:bg-[#272727] hover:text-white"
              >
                Explorer
              </button>

              <button
                type="button"
                onClick={closeSuccess}
                className="flex h-11 items-center justify-center rounded-xl border border-[#333] bg-[#202020] px-4 text-[12px] text-zinc-300 transition hover:bg-[#272727] hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentSuccess && current && (
        <div
          id="arivo-print-receipt"
          className="arivo-print-receipt"
          aria-hidden="true"
        >
          <div className="arivo-pdf-page">
            <header className="arivo-pdf-header">
              <div className="arivo-brand">
                <img className="arivo-logo-image" src="/arivo-icon.png" alt="Arivo" />
                <div className="arivo-brand-name">{t("merchant", "arivo")}</div>
              </div>

              <div className="arivo-paid-badge">{t("merchant", "paidUpper")}</div>
            </header>

            <main className="arivo-pdf-content">
              <div className="arivo-pdf-title-row">
                <div>
                  <div className="arivo-eyebrow">{t("merchant", "paymentReceiptUpper")}</div>
                  <h1>{serviceTitle(current.id)}</h1>
                  <p>
                    Receipt ID: ARV-
                    {txHash.slice(-6).toUpperCase()}
                  </p>
                  <p style={{ marginTop: "1.5mm" }}>
                    Order ID: {orderId || "—"}
                  </p>
                </div>

                <div className="arivo-status">
                  <span>{t("merchant", "statusUpper")}</span>
                  <strong>{t("merchant", "confirmed")}</strong>
                </div>
              </div>

              <section className="arivo-total-card">
                <div>
                  <span>{t("merchant", "paidUpper")}</span>
                  <strong>
                    {paymentEquivalents
                      ? `${paymentEquivalents[paymentAsset].toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          }
                        )} ${paymentAsset}`
                      : paymentAsset}
                  </strong>
                </div>

                <div className="arivo-total-side">
                  <span>{t("merchant", "serviceAmountUpper")}</span>
                  <strong>{orderPrice}</strong>
                </div>
              </section>

              <section className="arivo-detail-card">
                <div className="arivo-detail-row">
                  <span>{t("merchant", "network")}</span>
                  <strong>{t("common", "testnet")}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>{t("merchant", "paymentAsset")}</span>
                  <strong>{paymentAsset}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>{t("merchant", "orderStatus")}</span>
                  <strong>{t("merchant", "paymentConfirmed")}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>{t("merchant", "networkFee")}</span>
                  <strong>{networkFee} USDC</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>{t("merchant", "purchaseDate")}</span>
                  <strong>{confirmedAt}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>{t("merchant", "wallet")}</span>
                  <strong>{paymentReceiver}</strong>
                </div>

                {email && (
                  <div className="arivo-detail-row">
                    <span>{t("merchant", "receiptEmail")}</span>
                    <strong>{email}</strong>
                  </div>
                )}

                <div className="arivo-detail-row">
                  <span>{t("merchant", "emailStatus")}</span>
                  <strong>
                    {emailStatus === "sent"
                      ? "Confirmation sent"
                      : emailStatus === "sending"
                        ? "Sending"
                        : emailStatus === "failed"
                          ? "Delivery failed"
                          : "Not sent"}
                  </strong>
                </div>
              </section>

              <div style={{
                marginTop: "6mm",
                padding: "4.5mm 6mm",
                border: "0.35mm solid #dce2e9",
                borderRadius: "4mm",
                background: "#f8fafc",
                color: "#5f6b7d",
                fontSize: "3mm",
                lineHeight: 1.5,
              }}>
                <strong style={{
                  color: "#1f2937",
                  fontWeight: 700,
                }}>
                  Next step:{" "}
                </strong>
                {current.id === "giftcards"
                  ? "Gift card fulfilled and delivered to your email."
                  : current.id === "electricity"
                    ? "Electricity-bill fulfillment is pending provider confirmation."
                    : current.id === "internet"
                      ? "Internet-service fulfillment is pending provider confirmation."
                      : "Recharge fulfillment is pending provider confirmation."}
              </div>

              <section className="arivo-transaction-card">
                <div>
                  <div className="arivo-eyebrow">{t("merchant", "transactionUpper")}</div>
                  <div className="arivo-hash">{txHash}</div>
                </div>

                <div className="arivo-chain-badge">{t("merchant", "onChainUpper")}</div>
              </section>

              <section className="arivo-qr-section">
                <div className="arivo-qr-copy">
                  <div className="arivo-eyebrow">{t("merchant", "verifyPayment")}</div>
                  <h2>{t("merchant", "scanToViewTransaction")}</h2>
                  <p>
                    This QR code opens the transaction directly on ArcScan.
                  </p>
                  <div className="arivo-footer-note">
                    Arivo Pay · Arc Testnet
                  </div>
                </div>

                <img
                  className="arivo-qr"
                  src={`https://quickchart.io/qr?size=190&margin=1&text=${encodeURIComponent(
                    `https://testnet.arcscan.app/tx/${txHash}`
                  )}`}
                  alt={t("merchant", "qrAlt")}
                />
              </section>

              <footer className="arivo-pdf-footer">
                <div className="arivo-footer-brand">
                  <img className="arivo-footer-logo-image" src="/arivo-icon.png" alt="Arivo" />
                  <div>
                    <strong>{t("merchant", "arivo")}</strong>
                    <span>{t("merchant", "digitalPaymentReceipt")}</span>
                  </div>
                </div>

                <div className="arivo-footer-meta">
                  <span>{t("merchant", "builtOnArcTestnet")}</span>
                  <span>{t("merchant", "transactionVerified")}</span>
                </div>
              </footer>
            </main>
          </div>
        </div>
      )}

      <style jsx global>{`
        .arivo-print-receipt {
          display: none;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #arivo-print-receipt,
          #arivo-print-receipt * {
            visibility: visible !important;
          }

          #arivo-print-receipt {
            display: block !important;
            position: static !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .arivo-pdf-page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            overflow: hidden;
            background: #ffffff;
            color: #0a1020;
            font-family:
              Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
              "Segoe UI", sans-serif;
          }

          .arivo-pdf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 34mm;
            padding: 8mm 15mm;
            background: #07101f !important;
            color: #ffffff !important;
          }

          .arivo-brand {
            display: flex;
            align-items: center;
            gap: 4mm;
          }

          .arivo-logo-image {
            width: 14mm;
            height: 14mm;
            object-fit: contain;
            display: block;
          }

          .arivo-brand-name {
            color: #ffffff !important;
            font-size: 7mm;
            font-weight: 750;
            letter-spacing: -0.25mm;
          }

          .arivo-paid-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 24mm;
            height: 8mm;
            padding: 0 5mm;
            border-radius: 999px;
            background: #22c55e !important;
            color: #052812 !important;
            font-size: 3.1mm;
            font-weight: 800;
            letter-spacing: 0.45mm;
          }

          .arivo-pdf-content {
            padding: 11mm 15mm 9mm;
          }

          .arivo-pdf-title-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12mm;
            padding-bottom: 7mm;
          }

          .arivo-eyebrow {
            color: #7b8596 !important;
            font-size: 3mm;
            font-weight: 800;
            letter-spacing: 0.9mm;
          }

          .arivo-pdf-title-row h1 {
            margin: 2.5mm 0 1.5mm;
            color: #0a1020 !important;
            font-size: 9.5mm;
            line-height: 1.05;
            font-weight: 780;
            letter-spacing: -0.35mm;
          }

          .arivo-pdf-title-row p {
            margin: 0;
            color: #697386 !important;
            font-size: 3.2mm;
            line-height: 1.4;
          }

          .arivo-status {
            min-width: 34mm;
            padding-top: 2mm;
            text-align: right;
          }

          .arivo-status span {
            display: block;
            color: #8b94a4 !important;
            font-size: 2.8mm;
            font-weight: 800;
            letter-spacing: 0.75mm;
          }

          .arivo-status strong {
            display: block;
            margin-top: 1.5mm;
            color: #16a34a !important;
            font-size: 3.8mm;
            font-weight: 750;
          }

          .arivo-total-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10mm;
            margin-top: 2mm;
            padding: 7mm 8mm;
            border: 0.35mm solid #dce2e9;
            border-radius: 5mm;
            background: #f5f7fa !important;
          }

          .arivo-total-card span,
          .arivo-total-side span {
            display: block;
            color: #7b8596 !important;
            font-size: 2.8mm;
            font-weight: 800;
            letter-spacing: 0.75mm;
          }

          .arivo-total-card strong {
            display: block;
            margin-top: 1.8mm;
            color: #07101f !important;
            font-size: 7mm;
            line-height: 1;
            font-weight: 800;
            letter-spacing: -0.2mm;
          }

          .arivo-total-side {
            min-width: 48mm;
            padding-top: 1mm;
            text-align: right;
          }

          .arivo-total-side strong {
            display: block;
            margin-top: 1.8mm;
            color: #1c2431 !important;
            font-size: 4.2mm;
            font-weight: 750;
          }

          .arivo-detail-card {
            margin-top: 6mm;
            overflow: hidden;
            border: 0.35mm solid #dce2e9;
            border-radius: 5mm;
            background: #ffffff !important;
          }

          .arivo-detail-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10mm;
            min-height: 12.5mm;
            padding: 0 6mm;
            border-bottom: 0.25mm solid #e6eaf0;
          }

          .arivo-detail-row:last-child {
            border-bottom: 0;
          }

          .arivo-detail-row span {
            color: #687386 !important;
            font-size: 3.15mm;
            line-height: 1.3;
          }

          .arivo-detail-row strong {
            max-width: 125mm;
            overflow: hidden;
            color: #1a2230 !important;
            font-size: 3.15mm;
            line-height: 1.3;
            font-weight: 700;
            text-align: right;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .arivo-transaction-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8mm;
            margin-top: 6mm;
            padding: 6mm 6.5mm;
            border: 0.35mm solid #dce2e9;
            border-radius: 5mm;
            background: #ffffff !important;
          }

          .arivo-hash {
            margin-top: 2.5mm;
            max-width: 130mm;
            color: #2a3444 !important;
            font-size: 2.9mm;
            line-height: 1.45;
            word-break: break-all;
          }

          .arivo-chain-badge {
            flex-shrink: 0;
            padding: 2mm 3.5mm;
            border-radius: 999px;
            background: #ecfdf3 !important;
            color: #15803d !important;
            font-size: 2.7mm;
            font-weight: 800;
            letter-spacing: 0.25mm;
          }

          .arivo-qr-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10mm;
            margin-top: 7mm;
            padding-top: 6mm;
            border-top: 0.35mm solid #dfe4ea;
          }

          .arivo-qr-copy {
            max-width: 105mm;
          }

          .arivo-qr-copy h2 {
            margin: 2.2mm 0 1.4mm;
            color: #0a1020 !important;
            font-size: 4.6mm;
            line-height: 1.15;
            font-weight: 760;
          }

          .arivo-qr-copy p {
            margin: 0;
            color: #697386 !important;
            font-size: 3mm;
            line-height: 1.45;
          }

          .arivo-footer-note {
            margin-top: 5mm;
            color: #8a93a4 !important;
            font-size: 2.7mm;
            font-weight: 650;
          }

          .arivo-qr {
            width: 38mm;
            height: 38mm;
            padding: 1.8mm;
            border: 0.35mm solid #dce2e9;
            border-radius: 2.5mm;
            background: #ffffff !important;
          }

          .arivo-pdf-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8mm;
            margin-top: 8mm;
            padding-top: 5mm;
            border-top: 0.35mm solid #dfe4ea;
          }

          .arivo-footer-brand {
            display: flex;
            align-items: center;
            gap: 3mm;
          }

          .arivo-footer-logo-image {
            width: 8mm;
            height: 8mm;
            object-fit: contain;
            display: block;
          }

          .arivo-footer-brand strong {
            display: block;
            color: #0a1020 !important;
            font-size: 3.1mm;
            line-height: 1.1;
          }

          .arivo-footer-brand span {
            display: block;
            margin-top: 0.8mm;
            color: #8a93a4 !important;
            font-size: 2.5mm;
            line-height: 1.2;
          }

          .arivo-footer-meta {
            display: flex;
            gap: 6mm;
            color: #8993a4 !important;
            font-size: 2.5mm;
            line-height: 1.2;
            text-align: right;
          }
        }`}</style>
    </div>
  );
}
