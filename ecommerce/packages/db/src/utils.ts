// Utilitários puros (seguros para Client Components — não importam o Prisma)

export type OrderStatusKey = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED";

export const ORDER_STATUS_LABEL: Record<OrderStatusKey, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  CANCELED: "Cancelado",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** "1.299,90" | "1299.90" | "1299" -> 129990 */
export function parseBRLToCents(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Cor de texto legível (preto/branco) sobre um fundo hex */
export function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export type FulfillmentStatusKey = "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "DELIVERED";

export const FULFILLMENT_LABEL: Record<FulfillmentStatusKey, string> = {
  UNFULFILLED: "Não enviado",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
};

export type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

export function formatAddress(details: unknown): string[] {
  const d = details as ShippingDetails | null;
  if (!d?.address) return [];
  const a = d.address;
  return [d.name, [a.line1, a.line2].filter(Boolean).join(", "), [a.city, a.state].filter(Boolean).join(" - "), a.postal_code]
    .filter((l): l is string => !!l);
}

export const HOSTNAME = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
