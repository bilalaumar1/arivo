import {
  purchaseGiftCard,
  GiftCardPurchaseResult,
} from "./providers/giftcards";

import {
  updateArivoOrder,
  ArivoOrder,
} from "./orderStore";

export async function fulfillGiftCardOrder(
  order: ArivoOrder
): Promise<GiftCardPurchaseResult> {
  if (order.service !== "giftcards") {
    throw new Error("This order is not a gift card order.");
  }

  if (order.status !== "payment_confirmed") {
    throw new Error(
      "Gift card can only be fulfilled after payment confirmation."
    );
  }

  const result = await purchaseGiftCard({
    brand: order.serviceName,
    amount: order.localAmount ?? order.cryptoAmount,
    currency: order.localCurrency ?? order.paymentAsset,
    email: order.email,
  });

  if (!result.success) {
    updateArivoOrder(order.id, {
      status: "failed",
      fulfillmentNote: "Gift card fulfillment failed.",
    });

    throw new Error("Gift card fulfillment failed.");
  }

  updateArivoOrder(order.id, {
    status: "fulfilled",
    fulfillmentNote: `Gift card delivered to ${order.email}. Code: ${result.code}`,
  });

  return result;
}