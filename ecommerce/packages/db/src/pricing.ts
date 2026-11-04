// Cálculo puro do pedido — sem Prisma, sem I/O. Usado pelo checkout e pelos testes.
// A base será estendida nas Fases 1 e 3 (frete, desconto) sem mudar a assinatura.

export type PricingProduct = {
  id: string;
  name: string;
  priceInCents: number;
  stock: number;
  active: boolean;
};

export type PricingItem = {
  productId: string;
  quantity: number;
};

export type PricingLine = {
  productId: string;
  name: string;
  unitPriceInCents: number;
  quantity: number;
};

export type PricingResult =
  | { lines: PricingLine[]; subtotalInCents: number; totalInCents: number }
  | { error: string };

export function calculateOrderPricing(products: PricingProduct[], items: PricingItem[]): PricingResult {
  if (items.length === 0) return { error: "Carrinho vazio." };

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricingLine[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: "Quantidade inválida." };
    }

    const product = byId.get(item.productId);
    if (!product || !product.active) {
      return { error: "Um dos produtos não está mais disponível." };
    }
    if (product.stock < item.quantity) {
      return { error: `Estoque insuficiente para "${product.name}".` };
    }

    lines.push({
      productId: product.id,
      name: product.name,
      unitPriceInCents: product.priceInCents,
      quantity: item.quantity,
    });
  }

  const subtotalInCents = lines.reduce((sum, l) => sum + l.unitPriceInCents * l.quantity, 0);

  return { lines, subtotalInCents, totalInCents: subtotalInCents };
}
