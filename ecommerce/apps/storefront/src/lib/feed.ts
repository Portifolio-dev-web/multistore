import { prisma } from "@repo/db";
import { effectiveCompareAtPrice, effectivePrice, isPromoActive } from "@repo/db/utils";
import { storeUrl } from "@repo/db/urls";

type FeedStore = { id: string; name: string; currency: string; slug: string; customDomain: string | null };

const CONDITION_LABEL: Record<string, string> = { NEW: "new", USED: "used", REFURBISHED: "refurbished" };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function tag(name: string, value: string | number): string {
  return `<g:${name}>${esc(String(value))}</g:${name}>`;
}

/** F5.3: um item por variante — preço e estoque são por variante, não por produto. */
export async function buildProductFeed(store: FeedStore): Promise<string> {
  const products = await prisma.product.findMany({
    where: { storeId: store.id, active: true },
    include: { variants: { orderBy: { position: "asc" } } },
  });

  const base = storeUrl(store);
  const currency = store.currency.toUpperCase();
  const items = products.flatMap((product) => {
    const link = `${base}/produtos/${product.slug}`;
    const image = product.images[0];
    if (!image) return [];
    return product.variants.map((variant) => {
      const price = effectivePrice(variant, product);
      const compareAt = effectiveCompareAtPrice(variant, product);
      const onPromo = isPromoActive({ priceInCents: price, compareAtPriceInCents: compareAt, promoStartsAt: product.promoStartsAt, promoEndsAt: product.promoEndsAt });
      const regularPrice = compareAt ?? price;
      const fields = [
        tag("id", variant.id),
        tag("item_group_id", product.id),
        tag("title", product.name),
        tag("description", product.description || product.name),
        tag("link", link),
        tag("image_link", image),
        tag("availability", variant.stock > 0 ? "in stock" : "out of stock"),
        tag("price", `${(regularPrice / 100).toFixed(2)} ${currency}`),
        ...(onPromo ? [tag("sale_price", `${(price / 100).toFixed(2)} ${currency}`)] : []),
        tag("condition", CONDITION_LABEL[product.condition] ?? "new"),
        ...(product.brand ? [tag("brand", product.brand)] : []),
        ...(product.gtin ? [tag("gtin", product.gtin)] : []),
        ...(variant.sku ? [tag("mpn", variant.sku)] : []),
      ];
      return `<item>${fields.join("")}</item>`;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(store.name)}</title><link>${base}</link><description>Catálogo de produtos — ${esc(store.name)}</description>${items.join("")}</channel></rss>`;
}
