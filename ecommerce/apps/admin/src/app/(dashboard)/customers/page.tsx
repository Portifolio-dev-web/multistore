import Link from "next/link";
import { prisma, type Prisma } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const { storeId } = await requireSession();
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.CustomerWhereInput = {
    storeId,
    ...(q && { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const ids = customers.map((c) => c.id);
  const aggregates = ids.length
    ? await prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, status: "PAID" }, _sum: { totalInCents: true }, _count: { _all: true } })
    : [];
  const byCustomer = new Map(aggregates.map((a) => [a.customerId, a]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => `?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${total} no total`}
        action={<a href="/api/customers/export" className="btn-ghost" data-testid="export-customers-button">Exportar CSV</a>}
      />
      <form method="get" className="mb-4">
        <input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail…" className="field max-w-sm" data-testid="customers-search-input" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]" data-testid="customers-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Cliente</th>
              <th className="th">Desde</th>
              <th className="th">Pedidos pagos</th>
              <th className="th">Total gasto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => {
              const agg = byCustomer.get(c.id);
              return (
                <tr key={c.id} className="transition-colors hover:bg-bone/60" data-testid={`customer-row-${c.id}`}>
                  <td className="td">
                    <Link href={`/customers/${c.id}`} className="font-medium hover:underline" data-testid={`customer-link-${c.id}`}>{c.name || "—"}</Link>
                    <p className="font-mono text-xs text-ink/50">{c.email}</p>
                  </td>
                  <td className="td text-ink/60">{dateFmt.format(c.createdAt)}</td>
                  <td className="td text-ink/60">{agg?._count._all ?? 0}</td>
                  <td className="td font-medium">{formatBRL(agg?._sum.totalInCents ?? 0)}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="td py-14 text-center text-ink/50">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
