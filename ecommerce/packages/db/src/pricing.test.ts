import { describe, expect, it } from "vitest";
import { calculateOrderPricing, type PricingVariant } from "./pricing";

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
