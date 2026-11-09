import type { ShippingRate } from "@repo/db";
import { fixedRateQuotes } from "./fixed";
import { motoboyQuote, type MotoboyStore } from "./motoboy";
import { pickupQuote } from "./pickup";
import type { ShippingDestination, ShippingItem, ShippingQuote } from "./types";

export type { ShippingDestination, ShippingItem, ShippingQuote } from "./types";

type QuoteStore = MotoboyStore & { pickupEnabled: boolean; freeShippingMinInCents: number | null };

/**
 * Junta as opções de frete sem integração externa (retirada, frete fixo, motoboy).
 * A integração com transportadora (Melhor Envio) entra na F1.6 etapa 2, somada aqui.
 */
export async function getShippingQuotes(input: {
  store: QuoteStore;
  rates: ShippingRate[];
  destination: ShippingDestination;
  items: ShippingItem[];
  subtotalInCents: number;
}): Promise<ShippingQuote[]> {
  const { store, rates, destination, subtotalInCents } = input;

  const motoboy = await motoboyQuote(store, destination.zip);
  const quotes = [...pickupQuote(store), ...fixedRateQuotes(rates, destination), ...motoboy];

  const freeShipping = store.freeShippingMinInCents != null && subtotalInCents >= store.freeShippingMinInCents;
  return freeShipping ? quotes.map((q) => ({ ...q, priceInCents: 0 })) : quotes;
}
