"use client";

// F5.2: eventos de e-commerce — no-op se o visitante não aceitou cookies (nenhum script global existe).
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

type EventItem = { id: string; name: string; priceInCents: number; quantity?: number };

function gtagEvent(name: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) window.gtag("event", name, params);
}

function toValue(items: EventItem[]): number {
  return items.reduce((sum, i) => sum + (i.priceInCents / 100) * (i.quantity ?? 1), 0);
}

function toGtagItems(items: EventItem[], currency: string) {
  return items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.priceInCents / 100, quantity: i.quantity ?? 1, currency }));
}

export function trackViewItem(item: EventItem, currency: string) {
  gtagEvent("view_item", { currency, value: toValue([item]), items: toGtagItems([item], currency) });
  if (typeof window !== "undefined" && window.fbq) window.fbq("track", "ViewContent", { content_ids: [item.id], value: item.priceInCents / 100, currency });
  if (typeof window !== "undefined" && window.ttq) window.ttq.track("ViewContent", { content_id: item.id, value: item.priceInCents / 100, currency });
}

export function trackAddToCart(item: EventItem, currency: string) {
  gtagEvent("add_to_cart", { currency, value: toValue([item]), items: toGtagItems([item], currency) });
  if (typeof window !== "undefined" && window.fbq) window.fbq("track", "AddToCart", { content_ids: [item.id], value: toValue([item]), currency });
  if (typeof window !== "undefined" && window.ttq) window.ttq.track("AddToCart", { content_id: item.id, value: toValue([item]), currency });
}

export function trackBeginCheckout(items: EventItem[], currency: string) {
  if (items.length === 0) return;
  gtagEvent("begin_checkout", { currency, value: toValue(items), items: toGtagItems(items, currency) });
  if (typeof window !== "undefined" && window.fbq) window.fbq("track", "InitiateCheckout", { value: toValue(items), currency });
  if (typeof window !== "undefined" && window.ttq) window.ttq.track("InitiateCheckout", { value: toValue(items), currency });
}

/** purchase precisa disparar uma única vez por pedido — a deduplicação é feita por quem chama (ver TrackPurchase). */
export function trackPurchase(orderId: string, totalInCents: number, items: EventItem[], currency: string) {
  gtagEvent("purchase", { transaction_id: orderId, currency, value: totalInCents / 100, items: toGtagItems(items, currency) });
  if (typeof window !== "undefined" && window.fbq) window.fbq("track", "Purchase", { value: totalInCents / 100, currency });
  if (typeof window !== "undefined" && window.ttq) window.ttq.track("CompletePayment", { value: totalInCents / 100, currency });
}
