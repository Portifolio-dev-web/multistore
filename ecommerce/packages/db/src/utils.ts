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

/** Formato antigo, gravado a partir do `shipping_details` do Stripe (pedidos de antes da F1.3) */
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

/** Formato novo, preenchido pelo checkout próprio (F1.3) */
export type StructuredAddress = {
  name: string;
  zip: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
};

function isStructuredAddress(d: unknown): d is StructuredAddress {
  return !!d && typeof d === "object" && "zip" in d && "street" in d;
}

export function formatAddress(details: unknown): string[] {
  if (isStructuredAddress(details)) {
    const a = details;
    return [
      a.name,
      [a.street, a.number].filter(Boolean).join(", "),
      a.complement,
      a.district,
      [a.city, a.state].filter(Boolean).join(" - "),
      a.zip,
    ].filter((l): l is string => !!l);
  }

  const d = details as ShippingDetails | null;
  if (!d?.address) return [];
  const a = d.address;
  return [d.name, [a.line1, a.line2].filter(Boolean).join(", "), [a.city, a.state].filter(Boolean).join(" - "), a.postal_code]
    .filter((l): l is string => !!l);
}

export const HOSTNAME = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CEP = /^\d{5}-?\d{3}$/;
export const PHONE_BR = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

function hasCheckDigits(digits: string, weightsFirst: number[], weightsSecond: number[]): boolean {
  const checkDigit = (nums: number[], weights: number[]): number => {
    const sum = nums.reduce((acc, n, i) => acc + n * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const nums = digits.split("").map(Number);
  const d1 = checkDigit(nums.slice(0, weightsFirst.length), weightsFirst);
  const d2 = checkDigit(nums.slice(0, weightsSecond.length), weightsSecond);
  return nums[weightsFirst.length] === d1 && nums[weightsSecond.length] === d2;
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  return hasCheckDigits(
    digits,
    [10, 9, 8, 7, 6, 5, 4, 3, 2],
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  return hasCheckDigits(
    digits,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) pelos dígitos verificadores. Aceita com ou sem máscara. */
export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 11 ? isValidCpf(digits) : digits.length === 14 ? isValidCnpj(digits) : false;
}
