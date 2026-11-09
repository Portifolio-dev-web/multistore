import Link from "next/link";
import { prisma } from "@repo/db";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

export default async function CategoriesPage() {
  const { storeId } = await requireSession();
  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  const sorted = [...categories].sort((a, b) => categoryAncestors(categories, a.id).length - categoryAncestors(categories, b.id).length
    || a.position - b.position);

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle={`${categories.length} no total`}
        action={<Link href="/categories/new" className="btn" data-testid="new-category-button">+ Nova categoria</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px]" data-testid="categories-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Categoria</th>
              <th className="th">Produtos</th>
              <th className="th">Posição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((c) => {
              const depth = categoryAncestors(categories, c.id).length - 1;
              return (
                <tr key={c.id} className="transition-colors hover:bg-bone/60">
                  <td className="td">
                    <Link
                      href={`/categories/${c.id}`}
                      className="font-medium hover:underline"
                      style={{ paddingLeft: `${depth * 20}px` }}
                      data-testid={`category-row-${c.id}`}
                    >
                      {depth > 0 && "— "}
                      {c.name}
                    </Link>
                  </td>
                  <td className="td text-ink/60">{c._count.products}</td>
                  <td className="td font-mono text-ink/60">{c.position}</td>
                </tr>
              );
            })}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="td py-14 text-center text-ink/50">Nenhuma categoria. Crie a primeira!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
