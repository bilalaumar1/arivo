export type ArivoOrderStatus =
  | "payment_pending"
  | "payment_confirmed"
  | "processing"
  | "fulfilled"
  | "failed";

export type ArivoOrder = {
  id: string;
  service: "electricity" | "internet" | "mobile" | "giftcards";
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
  giftCardCode?: string;
};

const STORAGE_KEY = "arivo:orders:v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function makeOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ARV-${stamp.slice(-6)}-${random}`;
}

export function getArivoOrders(): ArivoOrder[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as ArivoOrder[]) : [];
  } catch (error) {
    console.error("Failed to read Arivo orders:", error);
    return [];
  }
}

export function saveArivoOrder(order: ArivoOrder) {
  if (!canUseStorage()) return;

  try {
    const orders = getArivoOrders();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([order, ...orders.filter((item) => item.id !== order.id)].slice(0, 100))
    );

    window.dispatchEvent(new Event("arivo:orders-updated"));
  } catch (error) {
    console.error("Failed to save Arivo order:", error);
  }
}

export function updateArivoOrder(
  orderId: string,
  patch: Partial<ArivoOrder>
) {
  if (!canUseStorage()) return;

  try {
    const orders = getArivoOrders().map((order) =>
      order.id === orderId
        ? {
            ...order,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : order
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event("arivo:orders-updated"));
  } catch (error) {
    console.error("Failed to update Arivo order:", error);
  }
}

export function createArivoOrder(
  input: Omit<ArivoOrder, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();

  const order: ArivoOrder = {
    ...input,
    id: makeOrderId(),
    createdAt: now,
    updatedAt: now,
  };

  saveArivoOrder(order);

  return order;
}
