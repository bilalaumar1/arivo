export type GiftCardProvider = "generic";

export type GiftCardPurchaseInput = {
  productId: string;
  amount: number;
  currency: string;
  email: string;
  orderId: string;
};

export type GiftCardPurchaseResult = {
  provider: GiftCardProvider;
  providerOrderId: string;
  status: "processing" | "fulfilled" | "failed";
  code?: string;
  pin?: string;
  expiresAt?: string;
  raw?: unknown;
};

export type GiftCardStatusResult = {
  providerOrderId: string;
  status: "processing" | "fulfilled" | "failed";
  code?: string;
  pin?: string;
  expiresAt?: string;
  raw?: unknown;
};

function getConfig() {
  const baseUrl = process.env.GIFTCARD_PROVIDER_URL;
  const apiKey = process.env.GIFTCARD_PROVIDER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Gift card provider is not configured. Add GIFTCARD_PROVIDER_URL and GIFTCARD_PROVIDER_API_KEY to .env.local."
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function providerRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { baseUrl, apiKey } = getConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Gift card provider returned ${response.status}.`;

    throw new Error(message);
  }

  return body as T;
}

/**
 * Creates a real gift-card order with the configured provider.
 *
 * IMPORTANT:
 * This function never generates a random gift-card code.
 * The code can only come back from the provider after a successful fulfillment.
 */
export async function buyGiftCard(
  input: GiftCardPurchaseInput
): Promise<GiftCardPurchaseResult> {
  if (!input.productId.trim()) {
    throw new Error("Gift card productId is required.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Gift card amount must be greater than zero.");
  }

  if (!input.currency.trim()) {
    throw new Error("Gift card currency is required.");
  }

  if (!input.email.trim()) {
    throw new Error("Customer email is required.");
  }

  if (!input.orderId.trim()) {
    throw new Error("Arivo orderId is required.");
  }

  const result = await providerRequest<{
    id?: string;
    orderId?: string;
    status?: string;
    code?: string;
    pin?: string;
    expiresAt?: string;
    data?: {
      id?: string;
      orderId?: string;
      status?: string;
      code?: string;
      pin?: string;
      expiresAt?: string;
    };
  }>("/gift-cards/orders", {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      reference: input.orderId,
    }),
  });

  const data = result.data ?? result;

  const providerOrderId = data.orderId ?? data.id;

  if (!providerOrderId) {
    throw new Error("Gift card provider did not return an order id.");
  }

  const status =
    data.status === "fulfilled" || data.code
      ? "fulfilled"
      : data.status === "failed"
        ? "failed"
        : "processing";

  return {
    provider: "generic",
    providerOrderId,
    status,
    code: data.code,
    pin: data.pin,
    expiresAt: data.expiresAt,
    raw: result,
  };
}

/**
 * Checks a previously created gift-card order.
 *
 * The exact URL is intentionally centralized here so we only have to
 * adapt one place when the real provider is selected.
 */
export async function getGiftCardStatus(
  providerOrderId: string
): Promise<GiftCardStatusResult> {
  if (!providerOrderId.trim()) {
    throw new Error("providerOrderId is required.");
  }

  const result = await providerRequest<{
    id?: string;
    orderId?: string;
    status?: string;
    code?: string;
    pin?: string;
    expiresAt?: string;
    data?: {
      id?: string;
      orderId?: string;
      status?: string;
      code?: string;
      pin?: string;
      expiresAt?: string;
    };
  }>(
    `/gift-cards/orders/${encodeURIComponent(providerOrderId)}`,
    {
      method: "GET",
    }
  );

  const data = result.data ?? result;

  return {
    providerOrderId: data.orderId ?? data.id ?? providerOrderId,
    status:
      data.status === "fulfilled" || data.code
        ? "fulfilled"
        : data.status === "failed"
          ? "failed"
          : "processing",
    code: data.code,
    pin: data.pin,
    expiresAt: data.expiresAt,
    raw: result,
  };
}
