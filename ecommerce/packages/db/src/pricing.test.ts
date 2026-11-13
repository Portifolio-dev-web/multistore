import { describe, expect, it } from "vitest";
import {
  applyCoupon,
  applyDiscounts,
  applyPromotions,
  calculateOrderPricing,
  distributeDiscountProportionally,
  type CouponInput,
  type PricingLine,
  type PricingVariant,
  type PromotionInput,
} from "./pricing";
import { formatBRL } from "./utils";

const camiseta: PricingVariant = { id: "v1", productId: "p1", name: "Camiseta", variantLabel: null, sku: null, priceInCents: 5000, stock: 10, active: true };
const caneca: PricingVariant = { id: "v2", productId: "p2", name: "Caneca", variantLabel: null, sku: null, priceInCents: 3000, stock: 2, active: true };
const descontinuado: PricingVariant = { id: "v3", productId: "p3", name: "Descontinuado", variantLabel: null, sku: null, priceInCents: 1000, stock: 10, active: false };

describe("calculateOrderPricing", () => {
  it("soma o subtotal de múltiplos itens", () => {
    const result = calculateOrderPricing([camiseta, caneca], [
      { variantId: "v1", quantity: 2 },
      { variantId: "v2", quantity: 1 },
    ]);

    expect(result).toEqual({
      lines: [
        { variantId: "v1", productId: "p1", name: "Camiseta", variantLabel: null, sku: null, unitPriceInCents: 5000, quantity: 2 },
        { variantId: "v2", productId: "p2", name: "Caneca", variantLabel: null, sku: null, unitPriceInCents: 3000, quantity: 1 },
      ],
      subtotalInCents: 13000,
      totalInCents: 13000,
    });
  });

  it("recusa carrinho vazio", () => {
    const result = calculateOrderPricing([camiseta], []);
    expect(result).toEqual({ error: "Carrinho vazio." });
  });

  it("recusa quantidade zero", () => {
    const result = calculateOrderPricing([camiseta], [{ variantId: "v1", quantity: 0 }]);
    expect(result).toEqual({ error: "Quantidade inválida." });
  });

  it("recusa quantidade negativa", () => {
    const result = calculateOrderPricing([camiseta], [{ variantId: "v1", quantity: -1 }]);
    expect(result).toEqual({ error: "Quantidade inválida." });
  });

  it("recusa variante inexistente", () => {
    const result = calculateOrderPricing([camiseta], [{ variantId: "inexistente", quantity: 1 }]);
    expect(result).toEqual({ error: "Um dos produtos não está mais disponível." });
  });

  it("recusa produto inativo", () => {
    const result = calculateOrderPricing([descontinuado], [{ variantId: "v3", quantity: 1 }]);
    expect(result).toEqual({ error: "Um dos produtos não está mais disponível." });
  });

  it("recusa estoque insuficiente", () => {
    const result = calculateOrderPricing([caneca], [{ variantId: "v2", quantity: 3 }]);
    expect(result).toEqual({ error: 'Estoque insuficiente para "Caneca".' });
  });

  it("aceita a última unidade em estoque", () => {
    const result = calculateOrderPricing([caneca], [{ variantId: "v2", quantity: 2 }]);
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.subtotalInCents).toBe(6000);
  });
});

const baseCoupon: CouponInput = {
  type: "PERCENT",
  value: 10,
  minOrderInCents: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usesCount: 0,
  maxUsesPerCustomer: null,
  customerUsesCount: 0,
  active: true,
};

describe("applyCoupon", () => {
  it("calcula desconto percentual", () => {
    expect(applyCoupon(10000, baseCoupon)).toEqual({ discountInCents: 1000 });
  });

  it("calcula desconto fixo, limitado ao subtotal", () => {
    expect(applyCoupon(500, { ...baseCoupon, type: "FIXED", value: 2000 })).toEqual({ discountInCents: 500 });
  });

  it("recusa cupom inativo", () => {
    expect(applyCoupon(10000, { ...baseCoupon, active: false })).toEqual({ error: "Cupom inválido." });
  });

  it("recusa cupom expirado", () => {
    expect(applyCoupon(10000, { ...baseCoupon, endsAt: new Date("2000-01-01") })).toEqual({ error: "Cupom expirado." });
  });

  it("recusa cupom ainda não iniciado", () => {
    expect(applyCoupon(10000, { ...baseCoupon, startsAt: new Date("2999-01-01") })).toEqual({ error: "Cupom ainda não é válido." });
  });

  it("recusa cupom esgotado", () => {
    expect(applyCoupon(10000, { ...baseCoupon, maxUses: 5, usesCount: 5 })).toEqual({ error: "Cupom esgotado." });
  });

  it("recusa cupom já usado pelo cliente", () => {
    expect(applyCoupon(10000, { ...baseCoupon, maxUsesPerCustomer: 1, customerUsesCount: 1 })).toEqual({ error: "Você já usou este cupom." });
  });

  it("recusa pedido abaixo do mínimo", () => {
    const result = applyCoupon(1000, { ...baseCoupon, minOrderInCents: 5000 });
    expect(result).toEqual({ error: `Pedido mínimo de ${formatBRL(5000)} para este cupom.` });
  });

  it("frete grátis não desconta nada (sem frete pago ainda)", () => {
    expect(applyCoupon(10000, { ...baseCoupon, type: "FREE_SHIPPING" })).toEqual({ discountInCents: 0 });
  });
});

const camisetaLine: PricingLine = { variantId: "v1", productId: "p1", name: "Camiseta", variantLabel: null, sku: null, unitPriceInCents: 5000, quantity: 3 };

describe("applyPromotions", () => {
  it("leve 3 pague 2: desconta a unidade mais cara do grupo", () => {
    const promo: PromotionInput = { id: "promo1", type: "BUY_X_PAY_Y", buyQuantity: 3, payQuantity: 2, minQuantity: null, percentOff: null, productIds: [] };
    expect(applyPromotions([camisetaLine], [promo])).toEqual([{ promotionId: "promo1", productId: "p1", discountInCents: 5000 }]);
  });

  it("leve 3 pague 2: não aplica com menos que o mínimo", () => {
    const promo: PromotionInput = { id: "promo1", type: "BUY_X_PAY_Y", buyQuantity: 3, payQuantity: 2, minQuantity: null, percentOff: null, productIds: [] };
    expect(applyPromotions([{ ...camisetaLine, quantity: 2 }], [promo])).toEqual([]);
  });

  it("desconto progressivo por quantidade", () => {
    const promo: PromotionInput = { id: "promo2", type: "QUANTITY_DISCOUNT", buyQuantity: null, payQuantity: null, minQuantity: 2, percentOff: 20, productIds: [] };
    expect(applyPromotions([camisetaLine], [promo])).toEqual([{ promotionId: "promo2", productId: "p1", discountInCents: 3000 }]);
  });

  it("ignora produto fora da lista da promoção", () => {
    const promo: PromotionInput = { id: "promo2", type: "QUANTITY_DISCOUNT", buyQuantity: null, payQuantity: null, minQuantity: 2, percentOff: 20, productIds: ["outro-produto"] };
    expect(applyPromotions([camisetaLine], [promo])).toEqual([]);
  });
});

describe("applyDiscounts", () => {
  it("aplica promoção e depois o cupom sobre o restante", () => {
    const promo: PromotionInput = { id: "promo2", type: "QUANTITY_DISCOUNT", buyQuantity: null, payQuantity: null, minQuantity: 2, percentOff: 20, productIds: [] };
    // subtotal 15000, promoção -3000 = 12000, cupom 10% sobre 12000 = -1200 => total 10800
    const result = applyDiscounts([camisetaLine], 15000, { promotions: [promo], coupon: baseCoupon });
    expect(result).toEqual({
      promotionDiscountInCents: 3000,
      couponDiscountInCents: 1200,
      totalInCents: 10800,
      promotionApplications: [{ promotionId: "promo2", productId: "p1", discountInCents: 3000 }],
    });
  });

  it("propaga erro do cupom sem aplicar promoções já computadas", () => {
    const result = applyDiscounts([camisetaLine], 15000, { coupon: { ...baseCoupon, active: false } });
    expect(result).toEqual({ error: "Cupom inválido." });
  });

  it("nunca fica negativo mesmo com cupom fixo maior que o subtotal", () => {
    const result = applyDiscounts([camisetaLine], 1000, { coupon: { ...baseCoupon, type: "FIXED", value: 5000 } });
    expect(result).toEqual({ promotionDiscountInCents: 0, couponDiscountInCents: 1000, totalInCents: 0, promotionApplications: [] });
  });
});

describe("distributeDiscountProportionally", () => {
  it("reduz a linha única pelo desconto cheio", () => {
    const [line] = distributeDiscountProportionally([camisetaLine], 3000);
    expect(line.unitPriceInCents).toBe(4000); // 15000 - 3000 = 12000 / 3 un.
  });

  it("sem desconto, devolve as linhas inalteradas", () => {
    expect(distributeDiscountProportionally([camisetaLine], 0)).toEqual([camisetaLine]);
  });

  it("distribui proporcionalmente entre duas linhas diferentes", () => {
    const caneca: PricingLine = { variantId: "v2", productId: "p2", name: "Caneca", variantLabel: null, sku: null, unitPriceInCents: 1000, quantity: 1 };
    // subtotal 16000 (camiseta 15000 + caneca 1000), desconto 1600 (10%) -> cada linha perde ~10%
    const result = distributeDiscountProportionally([camisetaLine, caneca], 1600);
    const newSubtotal = result.reduce((s, l) => s + l.unitPriceInCents * l.quantity, 0);
    expect(newSubtotal).toBeLessThanOrEqual(16000 - 1600);
    expect(newSubtotal).toBeGreaterThan(16000 - 1600 - 10);
  });
});
