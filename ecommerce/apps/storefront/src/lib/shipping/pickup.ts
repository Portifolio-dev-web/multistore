import type { ShippingQuote } from "./types";

export function pickupQuote(store: { pickupEnabled: boolean }): ShippingQuote[] {
  if (!store.pickupEnabled) return [];
  return [{ id: "pickup", name: "Retirar na loja", priceInCents: 0, minDays: 0, maxDays: 0 }];
}
