import { z } from "zod";
import { FulfillmentStatus } from "@repo/db";
import { HEX_COLOR, HOSTNAME, onlyDigits, parseBRLToCents, SLUG, WHATSAPP_PHONE } from "@repo/db/utils";

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
  categoryIds: z.array(z.string()).default([]),
  priceInCents: z
    .string()
    .transform(parseBRLToCents)
    .pipe(z.number({ invalid_type_error: "Preço inválido" }).int().min(50, "Preço mínimo: R$ 0,50").max(99_999_999)),
  compareAtPriceInCents: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? parseBRLToCents(v) : null))
    .pipe(z.number({ invalid_type_error: "Preço \"de\" inválido" }).int().min(50).max(99_999_999).nullable()),
  promoStartsAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  promoEndsAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  // Opcional: só vem no formulário quando o produto tem uma variante só (sem opções) — com
  // várias variantes, o estoque é editado na grade em /products/[id]/variants.
  stock: z.coerce.number({ invalid_type_error: "Estoque inválido" }).int().min(0, "Estoque não pode ser negativo").max(1_000_000).optional(),
  images: z
    .string()
    .transform((v) => v.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().url("URL de imagem inválida")).max(10, "Máximo de 10 imagens")),
  // Mesma ordem/posição de `images` (pode ter string vazia = sem alt pra aquela imagem).
  imageAlts: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split("\n").map((s) => s.trim())),
  active: z.boolean(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  slug: optionalText(80),
  description: z.string().trim().max(1000).default(""),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().url("URL inválida").nullable()),
  position: z.coerce.number({ invalid_type_error: "Posição inválida" }).int().min(0).max(100_000).default(0),
  parentId: optionalText(40),
});

const jsonArray = <T extends z.ZodTypeAny>(arraySchema: T) =>
  z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v || "[]");
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "JSON inválido" });
        return z.NEVER;
      }
    })
    .pipe(arraySchema);

export const productOptionsSchema = z.object({
  optionsJson: jsonArray(
    z
      .array(
        z.object({
          name: z.string().trim().min(1, "Nome da opção obrigatório").max(40),
          values: z.array(z.string().trim().min(1).max(40)).min(1, "Informe ao menos um valor"),
        }),
      )
      .max(3, "Máximo de 3 opções"),
  ),
});

const variantRowSchema = z.object({
  id: z.string().min(1),
  sku: z.string().trim().max(60).nullable(),
  priceInCents: z.number().int().min(0).max(99_999_999).nullable(),
  compareAtPriceInCents: z.number().int().min(0).max(99_999_999).nullable(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo").max(1_000_000),
});

export const productVariantsSchema = z.object({
  variantsJson: jsonArray(z.array(variantRowSchema)),
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
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : null))
    .pipe(z.string().regex(WHATSAPP_PHONE, "Número inválido (DDI+DDD+número, só dígitos)").nullable()),
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

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Mínimo de 3 caracteres")
      .max(30)
      .regex(/^[A-Z0-9_-]+$/, "Use letras, números, - ou _"),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: z.string().optional(),
    minOrder: z.string().trim().optional(),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    maxUses: z.string().trim().optional(),
    maxUsesPerCustomer: z.string().trim().optional(),
    active: z.boolean(),
  })
  .transform((d) => ({
    code: d.code,
    type: d.type,
    value: d.type === "FREE_SHIPPING" ? 0 : d.type === "PERCENT" ? Number(d.value) || 0 : parseBRLToCents(d.value || "0"),
    minOrderInCents: d.minOrder ? parseBRLToCents(d.minOrder) : null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    maxUses: d.maxUses ? Number(d.maxUses) : null,
    maxUsesPerCustomer: d.maxUsesPerCustomer ? Number(d.maxUsesPerCustomer) : null,
    active: d.active,
  }))
  .refine((d) => d.type !== "PERCENT" || (d.value >= 1 && d.value <= 100), {
    path: ["value"],
    message: "Porcentagem entre 1 e 100",
  });

export const promotionSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  type: z.enum(["BUY_X_PAY_Y", "QUANTITY_DISCOUNT"]),
  buyQuantity: z.coerce.number().int().min(2).max(50).optional(),
  payQuantity: z.coerce.number().int().min(1).max(49).optional(),
  minQuantity: z.coerce.number().int().min(2).max(1000).optional(),
  percentOff: z.coerce.number().int().min(1).max(100).optional(),
  productIds: z.array(z.string()).default([]),
  active: z.boolean(),
}).refine((d) => d.type !== "BUY_X_PAY_Y" || (d.buyQuantity != null && d.payQuantity != null && d.payQuantity < d.buyQuantity), {
  path: ["payQuantity"],
  message: "Quantidade a pagar deve ser menor que a quantidade mínima",
}).refine((d) => d.type !== "QUANTITY_DISCOUNT" || (d.minQuantity != null && d.percentOff != null), {
  path: ["minQuantity"],
  message: "Informe a quantidade mínima e o desconto",
});

export function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") obj[key] = value;
  });
  return obj;
}
