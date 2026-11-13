import Link from "next/link";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

export default async function PagesListPage() {
  const { storeId } = await requireSession();
  const pages = await prisma.page.findMany({ where: { storeId }, orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Páginas institucionais"
        subtitle={`${pages.length} no total`}
        action={<Link href="/pages/new" className="btn" data-testid="new-page-button">+ Nova página</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px]" data-testid="pages-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Página</th>
              <th className="th">Endereço</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pages.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-bone/60">
                <td className="td">
                  <Link href={`/pages/${p.id}`} className="font-medium hover:underline" data-testid={`page-row-${p.id}`}>{p.title}</Link>
                </td>
                <td className="td font-mono text-xs text-ink/60">/p/{p.slug}</td>
                <td className="td">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.published ? "bg-lime/30 text-ink" : "bg-ink/10 text-ink/50"}`}>
                    {p.published ? "Publicada" : "Rascunho"}
                  </span>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={3} className="td py-14 text-center text-ink/50">Nenhuma página. Crie a primeira!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
