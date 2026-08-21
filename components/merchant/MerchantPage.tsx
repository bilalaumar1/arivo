"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { sendUSDC } from "@/lib/sendUSDC";
import { sendEURC } from "@/lib/sendEURC";
import { publicClient } from "@/lib/publicClient";
import { formatUnits } from "viem";
import { createArivoOrder, updateArivoOrder } from "@/lib/orderStore";
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

type ServiceId = "electricity" | "internet" | "mobile" | "giftcards";
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

const giftCardPlans = [
  {
    id: "1m",
    label: "1 month",
    price: 5,
  },
  {
    id: "3m",
    label: "3 months",
    price: 10,
  },
  {
    id: "1y",
    label: "1 year",
    price: 48,
  },
] as const;

const giftCardBrands = ["Netflix", "Google Play", "Apple", "Steam"];

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

  const [giftBrand, setGiftBrand] = useState("Netflix");
  const [giftPlan, setGiftPlan] =
    useState<(typeof giftCardPlans)[number]["id"]>("1m");

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


  const paymentReceiver =
    process.env.NEXT_PUBLIC_ARIVO_PAY_RECEIVER ?? "";

  const current = useMemo(
    () =>
      services.find((service) => service.id === selectedService) ?? null,
    [selectedService]
  );

  const countryConfig = countries[country];

  const selectedInternetPlan =
    internetPlans.find((plan) => plan.id === internetPlan) ??
    internetPlans[0];

  const selectedGiftPlan =
    giftCardPlans.find((plan) => plan.id === giftPlan) ??
    giftCardPlans[0];

  const orderPrice = useMemo(() => {
    if (selectedService === "electricity") {
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
    if (selectedService === "electricity") {
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
    selectedService === "electricity" || selectedService === "mobile"
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
          throw new Error("Unable to load current exchange rates.");
        }

        const data = await response.json();
        if (!data?.rates || typeof data.rates !== "object") {
          throw new Error("Exchange-rate data is unavailable.");
        }

        setFxRates(data.rates as Record<string, number>);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("FX rate lookup failed:", error);
        setFxRates(null);
        setFxError("Current rate unavailable");
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

    if (selectedService === "electricity") {
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
      setPaymentError(
        "Payment setup is not configured yet. Add the Arivo payment wallet before sending real funds."
      );
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(paymentReceiver)) {
      setPaymentError("Configured payment wallet address is invalid.");
      return;
    }

    if (!paymentEquivalents) {
      setPaymentError(
        "The current payment quote is unavailable. Please wait for the rate and try again."
      );
      return;
    }

    const amount = paymentEquivalents[paymentAsset];

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Invalid payment amount.");
      return;
    }

    setPaying(true);

    try {
      let hash: string;

      const amountForToken = amount.toFixed(6);
      const receiver =
        paymentReceiver as `0x${string}`;

      if (paymentAsset === "USDC") {
        hash = await sendUSDC(receiver, amountForToken);
      } else {
        hash = await sendEURC(receiver, amountForToken);
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
        service: current.id,
        serviceName: current.title,
        email,
        country:
          selectedService === "electricity" ||
          selectedService === "mobile"
            ? countryConfig.name
            : undefined,
        localCurrency:
          selectedService === "electricity" ||
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
              "The payment was confirmed, but the email could not be sent."
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
            : "Payment confirmed, but email delivery failed."
        );
      }

      setPaymentSuccess(true);
      setPaymentError("");

      window.dispatchEvent(
        new Event("refreshBalance")
      );

      window.dispatchEvent(
        new Event("refreshTransactions")
      );
    } catch (error) {
      console.error("Arivo Pay transaction failed:", error);

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Payment failed. Please try again."
      );
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
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar />

      <main className="relative z-0 min-w-0 flex-1">
        <header className="flex h-[88px] items-center justify-between border-b border-[#292929] px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] bg-[#1d1d1d] text-zinc-300 transition hover:bg-[#252525]"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-[26px] font-semibold">
                Arivo Pay
              </h1>
              <p className="mt-1 text-[13px] text-zinc-500">
                Bills, recharge and digital purchases — paid from your
                Arc wallet.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-[#303030] bg-[#191919] px-4 py-2 sm:flex">
            <ShieldCheck size={15} className="text-green-500" />
            <span className="text-[12px] text-zinc-300">
              Arc Testnet
            </span>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-[1200px]">
            <section className="rounded-[26px] border border-[#2d2d2d] bg-[#191919] p-6 lg:p-8">
              <div className="max-w-[800px]">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                  ARIVO PAY
                </p>

                <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.03em]">
                  Pay everyday services with your wallet.
                </h2>

                <p className="mt-3 max-w-[730px] text-[13px] leading-6 text-zinc-500">
                  Select a service and enter the real information required
                  for that service. Your payment asset is selected only at
                  checkout.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Local service currency",
                    "USDC or EURC checkout",
                    "On-chain confirmation",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#303030] bg-[#202020] px-3 py-1.5 text-[11px] text-zinc-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h3 className="text-[19px] font-semibold">
                Choose a service
              </h3>

              <p className="mt-1 text-[12px] text-zinc-500">
                Prices are shown in the service's native/local currency.
                Payment is selected later.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {services.map((service) => {
                  const Icon = service.icon;

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => openCheckout(service.id)}
                      className="group rounded-[24px] border border-[#2d2d2d] bg-[#191919] p-5 text-left transition hover:-translate-y-[1px] hover:border-[#4a4a4a] hover:bg-[#1c1c1c]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#333] bg-[#202020]">
                          <Icon size={21} className="text-zinc-200" />
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#1c1c1c] text-zinc-600 transition group-hover:text-white">
                          <ArrowRight size={16} />
                        </div>
                      </div>

                      <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                        {service.group}
                      </p>

                      <h4 className="mt-2 text-[19px] font-semibold">
                        {service.title}
                      </h4>

                      <p className="mt-2 max-w-[430px] text-[12px] leading-5 text-zinc-500">
                        {service.description}
                      </p>

                      <div className="mt-7 border-t border-[#292929] pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-600">
                            Checkout
                          </span>
                          <span className="text-[11px] font-medium text-zinc-300">
                            Details → Payment
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Receipt,
                  title: "Native service pricing",
                  text: "Bills and recharges can stay in the currency used by the service.",
                },
                {
                  icon: CreditCard,
                  title: "Payment at checkout",
                  text: "USDC and EURC are payment assets, not the service's displayed price.",
                },
                {
                  icon: ShieldCheck,
                  title: "Confirm before fulfillment",
                  text: "The provider should be fulfilled only after the Arc payment is confirmed.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-[#2d2d2d] bg-[#191919] p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#303030] bg-[#202020]">
                      <Icon size={17} className="text-zinc-400" />
                    </div>

                    <h4 className="mt-4 text-[13px] font-semibold">
                      {item.title}
                    </h4>

                    <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="mt-8 rounded-[22px] border border-[#2d2d2d] bg-[#191919] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold">
                    Payment & orders
                  </h3>
                  <p className="mt-1 max-w-[620px] text-[12px] leading-5 text-zinc-500">
                    Track your service orders from blockchain confirmation
                    through provider fulfillment, or review the full wallet
                    transaction history.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      window.location.assign("/orders")
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#efe5d2] px-4 text-[12px] font-semibold text-black transition hover:bg-white"
                  >
                    View orders
                    <ArrowRight size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.assign("/transactions")
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#333] bg-[#202020] px-4 text-[12px] text-zinc-300 transition hover:bg-[#272727] hover:text-white"
                  >
                    Transactions
                    <ArrowRight size={15} />
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
                  {current.group}
                </p>
                <h2 className="mt-1 text-[20px] font-semibold">
                  {current.title}
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
                                  {config.name} · {config.currency}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}

                      {current.id === "electricity" && (
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
                              placeholder="Enter your customer number"
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[12px] text-zinc-400">
                              Bill amount · {countryConfig.currency}
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
                                placeholder="Enter the amount shown on your bill"
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
                              placeholder="Full service address"
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
                              placeholder="you@example.com"
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
                              placeholder="Enter account or line number"
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
                                      {plan.label}
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
                              placeholder="you@example.com"
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
                              placeholder="Enter mobile number"
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
                                  onClick={() =>
                                    setGiftBrand(brand)
                                  }
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
                              Subscription
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
                                placeholder="you@example.com"
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
                            {current.title}
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

                        {current.id === "electricity" && (
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
                              {countryConfig.name}
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
                        {current.title}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        {current.description}
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
        <div className="receipt-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="receipt-card w-full max-w-[560px] overflow-hidden rounded-[26px] border border-[#333] bg-[#171717] shadow-2xl">
            <div className="border-b border-[#2b2b2b] px-6 py-6 text-center">
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

            <div id="arivo-receipt" className="p-6">
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

              <div className="mt-5 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#202020] p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">Service</span>
                  <span className="text-[12px] font-medium text-white">
                    {current.title}
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
                  <span className="text-[11px] text-zinc-600">Paid</span>
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
                  <span className="text-[11px] text-zinc-600">Wallet</span>
                  <span className="max-w-[250px] truncate text-[11px] text-zinc-300">
                    {paymentReceiver || "Configured payment wallet"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-zinc-600">Date</span>
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
                <div className="arivo-brand-name">Arivo</div>
              </div>

              <div className="arivo-paid-badge">PAID</div>
            </header>

            <main className="arivo-pdf-content">
              <div className="arivo-pdf-title-row">
                <div>
                  <div className="arivo-eyebrow">PAYMENT RECEIPT</div>
                  <h1>{current.title}</h1>
                  <p>
                    Receipt ID: ARV-
                    {txHash.slice(-6).toUpperCase()}
                  </p>
                  <p style={{ marginTop: "1.5mm" }}>
                    Order ID: {orderId || "—"}
                  </p>
                </div>

                <div className="arivo-status">
                  <span>STATUS</span>
                  <strong>Confirmed</strong>
                </div>
              </div>

              <section className="arivo-total-card">
                <div>
                  <span>PAID</span>
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
                  <span>SERVICE AMOUNT</span>
                  <strong>{orderPrice}</strong>
                </div>
              </section>

              <section className="arivo-detail-card">
                <div className="arivo-detail-row">
                  <span>Network</span>
                  <strong>Arc Testnet</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>Payment asset</span>
                  <strong>{paymentAsset}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>Order status</span>
                  <strong>Payment confirmed</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>Network fee</span>
                  <strong>{networkFee} USDC</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>Purchase date</span>
                  <strong>{confirmedAt}</strong>
                </div>

                <div className="arivo-detail-row">
                  <span>Wallet</span>
                  <strong>{paymentReceiver}</strong>
                </div>

                {email && (
                  <div className="arivo-detail-row">
                    <span>Receipt email</span>
                    <strong>{email}</strong>
                  </div>
                )}

                <div className="arivo-detail-row">
                  <span>Email status</span>
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
                  ? "Gift-card fulfillment is pending provider delivery."
                  : current.id === "electricity"
                    ? "Electricity-bill fulfillment is pending provider confirmation."
                    : current.id === "internet"
                      ? "Internet-service fulfillment is pending provider confirmation."
                      : "Recharge fulfillment is pending provider confirmation."}
              </div>

              <section className="arivo-transaction-card">
                <div>
                  <div className="arivo-eyebrow">TRANSACTION</div>
                  <div className="arivo-hash">{txHash}</div>
                </div>

                <div className="arivo-chain-badge">ON-CHAIN</div>
              </section>

              <section className="arivo-qr-section">
                <div className="arivo-qr-copy">
                  <div className="arivo-eyebrow">VERIFY PAYMENT</div>
                  <h2>Scan to view transaction</h2>
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
                  alt="QR code for the ArcScan transaction"
                />
              </section>

              <footer className="arivo-pdf-footer">
                <div className="arivo-footer-brand">
                  <img className="arivo-footer-logo-image" src="/arivo-icon.png" alt="Arivo" />
                  <div>
                    <strong>Arivo</strong>
                    <span>Digital payment receipt</span>
                  </div>
                </div>

                <div className="arivo-footer-meta">
                  <span>Built on Arc Testnet</span>
                  <span>Transaction verified on-chain</span>
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
