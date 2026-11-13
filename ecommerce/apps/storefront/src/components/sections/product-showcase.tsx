import { prisma, type Prisma } from "@repo/db";
import { isPromoActive } from "@repo/db/utils";
import type { HomeSection } from "@repo/db/content";
import { withDefaultVariantPricing } from "@/lib/product-display";
import { ProductCard } from "@/components/product-card";

type Props = { section: Extract<HomeSection, { type: "productShowcase" }>; storeId: string; base: string };

// ponytail: mesmo teto de varredura em memória da F2.3/F2.5 pra filtrar promoção sem SQL cru.
const PROMO_SCAN_LIMIT = 200;

const include = {
  categories: { select: { name: true } },
  variants: { orderBy: { position: "asc" as const }, take: 1 },
  reviews: { where: { approved: true }, select: { rating: true } },
} satisfies Prisma.ProductInclude;

export async function ProductShowcase({ section, storeId, base }: Props) {
  const where: Prisma.ProductWhereInput = { storeId, active: true };

  let products;
  if (section.source === "category" && section.categorySlug) {
    const rows = await prisma.product.findMany({
      where: { ...where, categories: { some: { slug: section.categorySlug } } },
      orderBy: { createdAt: "desc" },
      take: section.limit,
      include,
    });
    products = rows.map(withDefaultVariantPricing);
  } else if (section.source === "promo") {
    const candidates = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: PROMO_SCAN_LIMIT, include });
    products = candidates.map(withDefaultVariantPricing).filter((p) => isPromoActive(p)).slice(0, section.limit);
  } else if (section.source === "featured") {
    const rows = await prisma.product.findMany({
      where: { ...where, variants: { some: { stock: { gt: 0 } } } },
      orderBy: { createdAt: "desc" },
      take: section.limit,
      include,
    });
    products = rows.map(withDefaultVariantPricing);
  } else {
    const rows = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: section.limit, include });
    products = rows.map(withDefaultVariantPricing);
  }

  if (products.length === 0) return null;

  return (
    <section data-testid="section-product-showcase">
      {section.title && <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{section.title}</h2>}
      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4" data-testid="section-product-showcase-grid">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard base={base} product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
