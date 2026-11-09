import type { ShippingRate } from "@repo/db";
import { onlyDigits } from "@repo/db/utils";
import type { ShippingDestination, ShippingQuote } from "./types";

/** Frete fixo por estado ou faixa de CEP — sem integração externa */
export function fixedRateQuotes(rates: ShippingRate[], destination: ShippingDestination): ShippingQuote[] {
  const zip = Number(onlyDigits(destination.zip));

  const matches = rates.filter((r) => {
    if (r.type === "STATE") return r.state === destination.state;
    if (!r.zipFrom || !r.zipTo) return false;
    const from = Number(onlyDigits(r.zipFrom));
    const to = Number(onlyDigits(r.zipTo));
    return zip >= from && zip <= to;
  });

  return matches.map((r) => ({ id: r.id, name: r.label, priceInCents: r.priceInCents, minDays: r.minDays, maxDays: r.maxDays }));
}
