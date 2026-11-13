"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/analytics-events";

type Props = { orderId: string; totalInCents: number; items: { id: string; name: string; priceInCents: number; quantity: number }[]; currency: string };

// F5.2: dispara "purchase" uma única vez por pedido (até num reload da página de sucesso).
export function TrackPurchase({ orderId, totalInCents, items, currency }: Props) {
  useEffect(() => {
    const key = `vitrine-purchase-tracked-${orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // sem localStorage, melhor arriscar medir 2x do que nunca medir
    }
    trackPurchase(orderId, totalInCents, items, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  return null;
}
