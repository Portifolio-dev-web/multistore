// Cálculo puro do pedido — sem Prisma, sem I/O. Usado pelo checkout e pelos testes.
// A base será estendida nas Fases 1 e 3 (frete, desconto) sem mudar a assinatura.

import { formatBRL } from "./utils";

export type PricingVariant = {
  id: string; // variantId
  productId: string;
  name: string; // nome do produto
  variantLabel: string | null;
  sku: string | null;
  priceInCents: number; // já o preço efetivo (produto ou override da variante)
  stock: number;
  active: boolean; // do produto
};

export type PricingItem = {
  variantId: string;
  quantity: number;
};

export type PricingLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  unitPriceInCents: number;
  quantity: number;
};

export type PricingResult =
  | { lines: PricingLine[]; subtotalInCents: number; totalInCents: number }
  | { error: string };

export function calculateOrderPricing(variants: PricingVariant[], items: PricingItem[]): PricingResult {
  if (items.length === 0) return { error: "Carrinho vazio." };

  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines: PricingLine[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Quantidade inválida." };
    }

    const variant = byId.get(item.variantId);
    if (!variant || !variant.active) {
      return { error: "Um dos produtos não está mais disponível." };
    }
    if (variant.stock < item.quantity) {
      return { error: `Estoque insuficiente para "${variant.name}".` };
    }

    lines.push({
      variantId: variant.id,
      productId: variant.productId,
      name: variant.name,
      variantLabel: variant.variantLabel,
      sku: variant.sku,
      unitPriceInCents: variant.priceInCents,
      quantity: item.quantity,
    });
  }

  const subtotalInCents = lines.reduce((sum, l) => sum + l.unitPriceInCents * l.quantity, 0);

  return { lines, subtotalInCents, totalInCents: subtotalInCents };
}

// ---------- F3.2 (cupons) e F3.3 (promoções automáticas) ----------
// Continuam puras: recebem dados já carregados do banco, nunca consultam nada.

export type CouponInput = {
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minOrderInCents: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usesCount: number;
  maxUsesPerCustomer: number | null;
  customerUsesCount: number;
  active: boolean;
};

export type CouponResult = { discountInCents: number } | { error: string };

export function applyCoupon(subtotalInCents: number, coupon: CouponInput, now: Date = new Date()): CouponResult {
  if (!coupon.active) return { error: "Cupom inválido." };
  if (coupon.startsAt && now < coupon.startsAt) return { error: "Cupom ainda não é válido." };
  if (coupon.endsAt && now > coupon.endsAt) return { error: "Cupom expirado." };
  if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) return { error: "Cupom esgotado." };
  if (coupon.maxUsesPerCustomer != null && coupon.customerUsesCount >= coupon.maxUsesPerCustomer) {
    return { error: "Você já usou este cupom." };
  }
  if (coupon.minOrderInCents != null && subtotalInCents < coupon.minOrderInCents) {
    return { error: `Pedido mínimo de ${formatBRL(coupon.minOrderInCents)} para este cupom.` };
  }

  const discountInCents =
    coupon.type === "PERCENT"
      ? Math.round((subtotalInCents * coupon.value) / 100)
      : coupon.type === "FIXED"
        ? Math.min(coupon.value, subtotalInCents)
        : 0; // FREE_SHIPPING: sem frete pago hoje (F1.6 pendente) — não há o que descontar ainda
  return { discountInCents };
}

export type PromotionInput = {
  id: string;
  type: "BUY_X_PAY_Y" | "QUANTITY_DISCOUNT";
  buyQuantity: number | null;
  payQuantity: number | null;
  minQuantity: number | null;
  percentOff: number | null;
  productIds: string[]; // vazio = aplica a todos os produtos da linha
};

export type PromotionApplication = { promotionId: string; productId: string; discountInCents: number };

/** Aplica cada promoção a cada produto do carrinho de forma independente (sem combinar entre si). */
export function applyPromotions(lines: PricingLine[], promotions: PromotionInput[]): PromotionApplication[] {
  const byProduct = new Map<string, PricingLine[]>();
  for (const l of lines) {
    const arr = byProduct.get(l.productId) ?? [];
    arr.push(l);
    byProduct.set(l.productId, arr);
  }

  const results: PromotionApplication[] = [];
  for (const promo of promotions) {
    for (const [productId, productLines] of byProduct) {
      if (promo.productIds.length > 0 && !promo.productIds.includes(productId)) continue;
      const totalQty = productLines.reduce((s, l) => s + l.quantity, 0);

      if (promo.type === "QUANTITY_DISCOUNT") {
        if (!promo.minQuantity || !promo.percentOff || totalQty < promo.minQuantity) continue;
        const subtotal = productLines.reduce((s, l) => s + l.unitPriceInCents * l.quantity, 0);
        const discountInCents = Math.round((subtotal * promo.percentOff) / 100);
        if (discountInCents > 0) results.push({ promotionId: promo.id, productId, discountInCents });
      } else if (promo.type === "BUY_X_PAY_Y") {
        if (!promo.buyQuantity || !promo.payQuantity || promo.payQuantity >= promo.buyQuantity) continue;
        const sets = Math.floor(totalQty / promo.buyQuantity);
        if (sets === 0) continue;
        const freeUnits = sets * (promo.buyQuantity - promo.payQuantity);
        // desconta as unidades mais caras primeiro (melhor pro cliente quando há preços diferentes na combinação)
        const unitPrices = productLines.flatMap((l) => Array(l.quantity).fill(l.unitPriceInCents)).sort((a, b) => b - a);
        const discountInCents = unitPrices.slice(0, freeUnits).reduce((s, p) => s + p, 0);
        if (discountInCents > 0) results.push({ promotionId: promo.id, productId, discountInCents });
      }
    }
  }
  return results;
}

export type DiscountResult =
  | { promotionDiscountInCents: number; couponDiscountInCents: number; totalInCents: number; promotionApplications: PromotionApplication[] }
  | { error: string };

/**
 * Ordem combinada (documentada e testada): promoções automáticas aplicam primeiro, por produto;
 * o cupom aplica depois, sobre o subtotal já descontado das promoções. Nunca fica negativo.
 */
export function applyDiscounts(
  lines: PricingLine[],
  subtotalInCents: number,
  options: { promotions?: PromotionInput[]; coupon?: CouponInput | null },
  now: Date = new Date(),
): DiscountResult {
  const promotionApplications = applyPromotions(lines, options.promotions ?? []);
  const promotionDiscountInCents = promotionApplications.reduce((s, a) => s + a.discountInCents, 0);

  let couponDiscountInCents = 0;
  if (options.coupon) {
    const afterPromotions = Math.max(0, subtotalInCents - promotionDiscountInCents);
    const result = applyCoupon(afterPromotions, options.coupon, now);
    if ("error" in result) return { error: result.error };
    couponDiscountInCents = result.discountInCents;
  }

  const totalInCents = Math.max(0, subtotalInCents - promotionDiscountInCents - couponDiscountInCents);
  return { promotionDiscountInCents, couponDiscountInCents, totalInCents, promotionApplications };
}

/**
 * Só para o valor cobrado no gateway de pagamento (Stripe não aceita `unit_amount` negativo nem
 * desconto fracionado por linha nativamente): reduz cada linha proporcionalmente ao desconto total,
 * mantendo `OrderItem`/exibição sempre no preço original (o desconto aparece como linha separada).
 */
export function distributeDiscountProportionally(lines: PricingLine[], discountInCents: number): PricingLine[] {
  if (discountInCents <= 0) return lines;
  const subtotalInCents = lines.reduce((s, l) => s + l.unitPriceInCents * l.quantity, 0);
  if (subtotalInCents <= 0) return lines;

  let remaining = discountInCents;
  return lines.map((l, i) => {
    const lineTotal = l.unitPriceInCents * l.quantity;
    const isLast = i === lines.length - 1;
    const share = isLast ? remaining : Math.min(remaining, Math.round((lineTotal / subtotalInCents) * discountInCents));
    remaining -= share;
    const newUnitPriceInCents = Math.max(0, Math.floor((lineTotal - share) / l.quantity));
    return { ...l, unitPriceInCents: newUnitPriceInCents };
  });
}
