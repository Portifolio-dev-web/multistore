import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { categoryAncestors, categoryDescendantIds } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { withDefaultVariantPricing } from "@/lib/product-display";
import { ProductCard } from "@/components/product-card";

type Props = { params: { store: string; slug: string[] } };

export default async function CategoryPage({ params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const allCategories = await prisma.category.findMany({ where: { storeId: store.id } });
  // ponytail: o slug é único por loja, então resolve pelo último segmento da URL só —
  // não valida se os segmentos anteriores batem com a árvore de verdade.
  const leafSlug = params.slug.at(-1);
  const category = allCategories.find((c) => c.slug === leafSlug);
  if (!category) notFound();

  const base = getStoreBase(store.slug);
  const breadcrumb = categoryAncestors(allCategories, category.id);
  const children = allCategories
    .filter((c) => c.parentId === category.id)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  const descendantIds = categoryDescendantIds(allCategories, category.id);
  const productsFetched = await prisma.product.findMany({
    where: { storeId: store.id, active: true, categories: { some: { id: { in: descendantIds } } } },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { categories: { select: { name: true } }, variants: { orderBy: { position: "asc" }, take: 1 } },
  });
  const products = productsFetched.map(withDefaultVariantPricing);

  const pathTo = (index: number) => storeHref(base, `/categorias/${breadcrumb.slice(0, index + 1).map((c) => c.slug).join("/")}`);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-ink/50" data-testid="category-breadcrumb">
        <Link href={base || "/"} className="hover:text-ink hover:underline">Vitrine</Link>
        {breadcrumb.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <span>›</span>
            <Link href={pathTo(i)} className="hover:text-ink hover:underline" data-testid={`category-breadcrumb-${c.slug}`}>
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl" data-testid="category-name">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-ink/60">{category.description}</p>}

      {children.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" data-testid="category-children">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={storeHref(base, `/categorias/${[...breadcrumb.map((c) => c.slug), child.slug].join("/")}`)}
                className="btn-ghost"
                data-testid={`category-child-${child.slug}`}
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-ink/50" data-testid="category-products-count">
        {products.length} {products.length === 1 ? "produto" : "produtos"}
      </p>
      {products.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-ink/15 p-16 text-center text-ink/50" data-testid="category-products-empty">
          Nenhum produto nesta categoria ainda.
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4" data-testid="category-products-grid">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard base={base} product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
