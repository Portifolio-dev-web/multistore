import { notFound } from "next/navigation";
import { prisma, type Prisma } from "@repo/db";
import { categoryAncestors, categoryDescendantIds, isPromoActive } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase } from "@/lib/paths";
import { withDefaultVariantPricing } from "@/lib/product-display";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, type FilterValues } from "@/components/product-filters";

type Props = { params: { store: string }; searchParams: Record<string, string | undefined> };

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  recent: { createdAt: "desc" },
  "price-asc": { priceInCents: "asc" },
  "price-desc": { priceInCents: "desc" },
  name: { name: "asc" },
};

const toCents = (v?: string) => {
  const n = Number(v?.replace(",", "."));
  return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

export default async function StorePage({ params, searchParams }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const filters: FilterValues = {
    q: searchParams.q?.trim() ?? "",
    category: searchParams.category ?? "",
    min: searchParams.min ?? "",
    max: searchParams.max ?? "",
    sort: searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "recent",
    inStock: searchParams.stock === "1",
    onPromo: searchParams.promo === "1",
  };

  const allCategories = await prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" } });
  const selectedCategory = filters.category ? allCategories.find((c) => c.slug === filters.category) : undefined;

  const where: Prisma.ProductWhereInput = {
    storeId: store.id,
    active: true,
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
    ...(selectedCategory && { categories: { some: { id: { in: categoryDescendantIds(allCategories, selectedCategory.id) } } } }),
    ...(filters.inStock && { variants: { some: { stock: { gt: 0 } } } }),
    priceInCents: { gte: toCents(filters.min), lte: toCents(filters.max) },
  };

  const productsFetched = await prisma.product.findMany({
    where,
    orderBy: SORTS[filters.sort],
    take: 60,
    include: { categories: { select: { name: true } }, variants: { orderBy: { position: "asc" }, take: 1 } },
  });
  const withEffectivePrice = productsFetched.map(withDefaultVariantPricing);
  // ponytail: comparar priceInCents/compareAtPriceInCents exige SQL cru (duas colunas da mesma linha);
  // como a listagem já é um `take: 60` sem paginação de verdade, filtra em JS aqui mesmo.
  const products = filters.onPromo ? withEffectivePrice.filter((p) => isPromoActive(p)) : withEffectivePrice;
  const categoryOptions = allCategories.map((c) => ({
    slug: c.slug,
    label: "— ".repeat(categoryAncestors(allCategories, c.id).length - 1) + c.name,
  }));
  const base = getStoreBase(store.slug);

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <section className="grid gap-8 py-16 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="animate-rise">
          <span className="mb-5 inline-block h-1.5 w-16 rounded-full bg-accent" />
          <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">{store.name}</h1>
        </div>
        {store.description && <p className="max-w-md text-base text-ink/60 animate-rise [animation-delay:120ms]">{store.description}</p>}
      </section>

      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <ProductFilters base={base} categories={categoryOptions} values={filters} />
        <section>
          <p className="mb-6 text-sm text-ink/50" data-testid="products-count">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>
          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 p-16 text-center text-ink/50" data-testid="products-empty">
              Nenhum produto encontrado com esses filtros.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3" data-testid="products-grid">
              {products.map((p, i) => (
                <li key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                  <ProductCard base={base} product={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
