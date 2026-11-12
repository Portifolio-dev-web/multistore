// Cálculo puro do pedido — sem Prisma, sem I/O. Usado pelo checkout e pelos testes.
// A base será estendida nas Fases 1 e 3 (frete, desconto) sem mudar a assinatura.

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
