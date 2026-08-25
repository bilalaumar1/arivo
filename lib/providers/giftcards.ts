export type GiftCardPurchaseInput = {
  brand: string;
  amount: number;
  currency: string;
  email: string;
};

export type GiftCardPurchaseResult = {
  success: boolean;
  brand: string;
  amount: number;
  currency: string;
  code: string;
  email: string;
  message: string;
};

function generateTestGiftCardCode() {
  const part = () =>
    Math.random().toString(36).slice(2, 8).toUpperCase();

  return `${part()}-${part()}-${part()}`;
}

export async function purchaseGiftCard(
  input: GiftCardPurchaseInput
): Promise<GiftCardPurchaseResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    brand: input.brand,
    amount: input.amount,
    currency: input.currency,
    code: generateTestGiftCardCode(),
    email: input.email,
    message: "Gift card purchased successfully.",
  };
}