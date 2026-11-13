import Link from "next/link";
import { prisma } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const { storeId } = await requireSession();
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where = {
    storeId,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { variants: { some: { sku: { contains: q, mode: "insensitive" as const } } } },
      ],
    }),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { categories: { select: { name: true } }, variants: { select: { stock: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => `/products?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle={`${total} no catálogo`}
        action={
          <div className="flex gap-2">
            <Link href="/products/import-export" className="btn-outline" data-testid="import-export-link">Importar/exportar</Link>
            <Link href="/products/new" className="btn" data-testid="new-product-button">+ Novo produto</Link>
          </div>
        }
      />
      <form method="get" className="mb-4 max-w-sm">
        <input name="q" defaultValue={q} placeholder="Buscar por nome ou SKU…" className="field" data-testid="products-search-input" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]" data-testid="products-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Produto</th>
              <th className="th">Categoria</th>
              <th className="th">Preço</th>
              <th className="th">Estoque</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
              <tr key={p.id} className="transition-colors hover:bg-bone/60">
                <td className="td">
                  <Link href={`/products/${p.id}`} className="flex items-center gap-3 font-medium hover:underline" data-testid={`product-row-${p.id}`}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <span className="h-10 w-10 rounded-md bg-line" />
                    )}
                    {p.name}
                  </Link>
                </td>
                <td className="td text-ink/60">{p.categories.map((c) => c.name).join(", ") || "—"}</td>
                <td className="td font-mono">{formatBRL(p.priceInCents)}</td>
                <td className={`td font-mono ${stock === 0 ? "text-red-700" : ""}`}>{stock}</td>
                <td className="td">
                  <span className={`font-mono text-[11px] uppercase ${p.active ? "text-ink" : "text-ink/40"}`}>{p.active ? "● Ativo" : "○ Oculto"}</span>
                </td>
              </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-14 text-center text-ink/50">Nenhum produto. Crie o primeiro!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
