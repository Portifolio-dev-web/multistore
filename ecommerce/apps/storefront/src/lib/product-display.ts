import type { Product, ProductVariant } from "@repo/db";
import { effectiveCompareAtPrice, effectivePrice } from "@repo/db/utils";

type ProductWithDefaultVariant = Product & { variants: Pick<ProductVariant, "priceInCents" | "compareAtPriceInCents" | "stock">[] };

/**
 * F2.2 etapa 1: cada produto tem uma variante só (a padrão) — resolve preço/estoque "efetivos"
 * dela pra exibir no card/filtro sem o chamador precisar saber de `ProductVariant`.
 */
export function withDefaultVariantPricing<T extends ProductWithDefaultVariant>(product: T) {
  const variant = product.variants[0];
  return {
    ...product,
    priceInCents: variant ? effectivePrice(variant, product) : product.priceInCents,
    compareAtPriceInCents: variant ? effectiveCompareAtPrice(variant, product) : product.compareAtPriceInCents,
    stock: variant?.stock ?? 0,
  };
}
