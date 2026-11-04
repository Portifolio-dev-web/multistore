import { describe, expect, it } from "vitest";
import { calculateOrderPricing, type PricingProduct } from "./pricing";

const camiseta: PricingProduct = { id: "p1", name: "Camiseta", priceInCents: 5000, stock: 10, active: true };
const caneca: PricingProduct = { id: "p2", name: "Caneca", priceInCents: 3000, stock: 2, active: true };
const descontinuado: PricingProduct = { id: "p3", name: "Descontinuado", priceInCents: 1000, stock: 10, active: false };

describe("calculateOrderPricing", () => {
  it("soma o subtotal de múltiplos itens", () => {
    const result = calculateOrderPricing([camiseta, caneca], [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ]);

    expect(result).toEqual({
      lines: [
        { productId: "p1", name: "Camiseta", unitPriceInCents: 5000, quantity: 2 },
        { productId: "p2", name: "Caneca", unitPriceInCents: 3000, quantity: 1 },
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
    const result = calculateOrderPricing([camiseta], [{ productId: "p1", quantity: 0 }]);
    expect(result).toEqual({ error: "Quantidade inválida." });
  });

  it("recusa quantidade negativa", () => {
    const result = calculateOrderPricing([camiseta], [{ productId: "p1", quantity: -1 }]);
    expect(result).toEqual({ error: "Quantidade inválida." });
  });

  it("recusa produto inexistente", () => {
    const result = calculateOrderPricing([camiseta], [{ productId: "inexistente", quantity: 1 }]);
    expect(result).toEqual({ error: "Um dos produtos não está mais disponível." });
  });

  it("recusa produto inativo", () => {
    const result = calculateOrderPricing([descontinuado], [{ productId: "p3", quantity: 1 }]);
    expect(result).toEqual({ error: "Um dos produtos não está mais disponível." });
  });

  it("recusa estoque insuficiente", () => {
    const result = calculateOrderPricing([caneca], [{ productId: "p2", quantity: 3 }]);
    expect(result).toEqual({ error: 'Estoque insuficiente para "Caneca".' });
  });

  it("aceita a última unidade em estoque", () => {
    const result = calculateOrderPricing([caneca], [{ productId: "p2", quantity: 2 }]);
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.subtotalInCents).toBe(6000);
  });
});
