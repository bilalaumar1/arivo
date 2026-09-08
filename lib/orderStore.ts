export type ArivoOrderStatus =
  | "payment_pending"
  | "payment_confirmed"
  | "processing"
  | "fulfilled"
  | "failed";

export type ArivoOrderService =
  | "electricity"
  | "internet"
  | "mobile"
  | "giftcards";

export type ArivoOrder = {
  id: string;
  ownerWalletAddress?: string;
  service: ArivoOrderService;
  serviceName: string;
  email: string;
  country?: string;
  localCurrency?: string;
  localAmount?: number;
  localAmountFormatted: string;
  paymentAsset: "USDC" | "EURC";
  cryptoAmount: number;
  transactionHash: string;
  paymentReceiver: string;
  network: "Arc Testnet";
  status: ArivoOrderStatus;
  createdAt: string;
  updatedAt: string;
  fulfillmentNote: string;
};

const STORAGE_KEY = "arivo:orders:v2";
const LEGACY_STORAGE_KEY = "arivo:orders:v1";

export function getArivoOrders(): ArivoOrder[] {
  if (typeof window === "undefined") return [];
  try {
    // Remove the old shared order store once so legacy orders cannot reappear.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ArivoOrder[]) : [];
  } catch {
    return [];
  }
}

export function getArivoOrder(id: string) {
  return getArivoOrders().find((order) => order.id === id) ?? null;
}

export function saveArivoOrder(order: ArivoOrder) {
  if (typeof window === "undefined") return;
  const orders = getArivoOrders().filter((item) => item.id !== order.id);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([order, ...orders].slice(0, 100))
  );
  window.dispatchEvent(new Event("arivo:orders-updated"));
}

export function createArivoOrder(
  input: Omit<ArivoOrder, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const order: ArivoOrder = {
    ...input,
    id: `ARV-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
  };
  saveArivoOrder(order);
  return order;
}

export function updateArivoOrder(
  id: string,
  patch: Partial<ArivoOrder>
) {
  const order = getArivoOrder(id);
  if (!order) return null;

  const updated = {
    ...order,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  saveArivoOrder(updated);
  return updated;
}

export function updateArivoOrderStatus(
  id: string,
  status: ArivoOrderStatus,
  fulfillmentNote?: string
) {
  const order = getArivoOrder(id);
  if (!order) return null;

  const updated = {
    ...order,
    status,
    fulfillmentNote: fulfillmentNote ?? order.fulfillmentNote,
    updatedAt: new Date().toISOString(),
  };

  saveArivoOrder(updated);
  return updated;
}
