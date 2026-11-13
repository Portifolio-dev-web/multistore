import { notFound } from "next/navigation";
import { prisma, type Prisma } from "@repo/db";
import { categoryAncestors, categoryDescendantIds, isPromoActive } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { withDefaultVariantPricing } from "@/lib/product-display";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, type FilterValues } from "@/components/product-filters";
import { Pagination } from "@/components/pagination";

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

const PAGE_SIZE = 24;
// ponytail: comparar priceInCents/compareAtPriceInCents exige SQL cru (duas colunas da mesma
// linha) — sem isso não dá pra paginar "Em promoção" direto no banco. Busca até esse teto, filtra
// em memória e pagina o resultado já filtrado. Catálogo bem maior com esse filtro ligado precisaria
// de uma coluna calculada; não é o caso hoje.
const PROMO_FILTER_SCAN_LIMIT = 500;

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

  const page = Math.max(1, Number(searchParams.page) || 1);
  const productInclude = {
    categories: { select: { name: true } },
    variants: { orderBy: { position: "asc" as const }, take: 1 },
    reviews: { where: { approved: true }, select: { rating: true } },
  } satisfies Prisma.ProductInclude;

  const { total, products } = filters.onPromo
    ? await (async () => {
        const candidates = await prisma.product.findMany({ where, orderBy: SORTS[filters.sort], take: PROMO_FILTER_SCAN_LIMIT, include: productInclude });
        const onPromo = candidates.map(withDefaultVariantPricing).filter((p) => isPromoActive(p));
        return { total: onPromo.length, products: onPromo.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
      })()
    : await (async () => {
        const [count, rows] = await Promise.all([
          prisma.product.count({ where }),
          prisma.product.findMany({ where, orderBy: SORTS[filters.sort], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: productInclude }),
        ]);
        return { total: count, products: rows.map(withDefaultVariantPricing) };
      })();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryOptions = allCategories.map((c) => ({
    slug: c.slug,
    label: "— ".repeat(categoryAncestors(allCategories, c.id).length - 1) + c.name,
  }));
  const base = getStoreBase(store.slug);
  const buildPageHref = (p: number) =>
    storeHref(
      base,
      `?${new URLSearchParams({
        ...(filters.q && { q: filters.q }),
        ...(filters.category && { category: filters.category }),
        ...(filters.min && { min: filters.min }),
        ...(filters.max && { max: filters.max }),
        ...(filters.sort !== "recent" && { sort: filters.sort }),
        ...(filters.inStock && { stock: "1" }),
        ...(filters.onPromo && { promo: "1" }),
        page: String(p),
      })}`,
    );

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
            {total} {total === 1 ? "produto" : "produtos"}
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
          <Pagination page={page} totalPages={totalPages} buildHref={buildPageHref} />
        </section>
      </div>
    </div>
  );
}
