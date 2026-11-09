import { z } from "zod";
import { FulfillmentStatus } from "@repo/db";
import { HEX_COLOR, HOSTNAME, parseBRLToCents, SLUG } from "@repo/db/utils";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
  storeName: z.string().trim().min(2, "Informe o nome da loja").max(80),
  storeSlug: z.string().trim().toLowerCase().regex(SLUG, "Use apenas letras minúsculas, números e hífens").max(48),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  slug: optionalText(80),
  description: z.string().trim().max(5000).default(""),
  category: optionalText(60),
  priceInCents: z
    .string()
    .transform(parseBRLToCents)
    .pipe(z.number({ invalid_type_error: "Preço inválido" }).int().min(50, "Preço mínimo: R$ 0,50").max(99_999_999)),
  stock: z.coerce.number({ invalid_type_error: "Estoque inválido" }).int().min(0, "Estoque não pode ser negativo").max(1_000_000),
  images: z
    .string()
    .transform((v) => v.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().url("URL de imagem inválida")).max(10, "Máximo de 10 imagens")),
  active: z.boolean(),
});

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(SLUG, "Use apenas letras minúsculas, números e hífens").max(48),
  description: optionalText(500),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().url("URL inválida").nullable()),
  primaryColor: z.string().regex(HEX_COLOR, "Cor inválida"),
  accentColor: z.string().regex(HEX_COLOR, "Cor inválida"),
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null)
    .pipe(z.string().regex(HOSTNAME, "Domínio inválido (ex.: www.minhaloja.com.br)").nullable()),
});

export const fulfillmentSchema = z
  .object({
    fulfillmentStatus: z.nativeEnum(FulfillmentStatus),
    carrier: optionalText(60),
    trackingCode: optionalText(80),
    trackingUrl: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .pipe(z.string().url("URL inválida").nullable()),
    notify: z.boolean(),
  })
  .refine((d) => !["SHIPPED", "DELIVERED"].includes(d.fulfillmentStatus) || !!d.trackingCode, {
    path: ["trackingCode"],
    message: "Informe o código de rastreio para marcar como enviado",
  });

export function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") obj[key] = value;
  });
  return obj;
}
