import Link from "next/link";
import { prisma, OrderStatus, FulfillmentStatus, type Prisma } from "@repo/db";
import { formatBRL, FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const PAGE_SIZE = 20;

type SearchParams = { status?: string; fulfillment?: string; q?: string; from?: string; to?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { storeId } = await requireSession();
  const status = Object.values(OrderStatus).find((s) => s === searchParams.status);
  const fulfillment = Object.values(FulfillmentStatus).find((s) => s === searchParams.fulfillment);
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.OrderWhereInput = {
    storeId,
    ...(status && { status }),
    ...(fulfillment && { fulfillmentStatus: fulfillment }),
    ...(searchParams.from && { createdAt: { gte: new Date(searchParams.from) } }),
    ...(searchParams.to && { createdAt: { lte: new Date(`${searchParams.to}T23:59:59`) } }),
    ...(q && {
      OR: [
        ...(Number.isInteger(Number(q)) ? [{ number: Number(q) }] : []),
        { customerEmail: { contains: q, mode: "insensitive" as const } },
        { customerName: { contains: q, mode: "insensitive" as const } },
        { customerDocument: { contains: q } },
      ],
    }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) =>
    `/orders?${new URLSearchParams({
      ...(status && { status }),
      ...(fulfillment && { fulfillment }),
      ...(q && { q }),
      ...(searchParams.from && { from: searchParams.from }),
      ...(searchParams.to && { to: searchParams.to }),
      page: String(p),
    })}`;

  const tabs = [{ value: undefined, label: "Todos" }, ...Object.values(OrderStatus).map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] }))];

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Atualizados automaticamente pelo webhook do Stripe." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/orders?status=${t.value}` : "/orders"}
            data-testid={`orders-filter-${t.value ?? "all"}`}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${status === t.value ? "bg-ink text-bone" : "border border-line bg-white hover:border-ink/40"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <div>
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Nº, e-mail, nome ou CPF/CNPJ" className="field" data-testid="orders-search-input" />
        </div>
        <div>
          <label className="label" htmlFor="fulfillment">Entrega</label>
          <select id="fulfillment" name="fulfillment" defaultValue={fulfillment ?? ""} className="field" data-testid="orders-fulfillment-select">
            <option value="">Todas</option>
            {Object.values(FulfillmentStatus).map((f) => (
              <option key={f} value={f}>{FULFILLMENT_LABEL[f]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">De</label>
          <input id="from" name="from" type="date" defaultValue={searchParams.from} className="field" data-testid="orders-from-input" />
        </div>
        <div>
          <label className="label" htmlFor="to">Até</label>
          <input id="to" name="to" type="date" defaultValue={searchParams.to} className="field" data-testid="orders-to-input" />
        </div>
        <button type="submit" className="btn-outline" data-testid="orders-filter-apply-button">Filtrar</button>
        <Link href={status ? `/orders?status=${status}` : "/orders"} className="btn-ghost" data-testid="orders-filter-clear-link">Limpar</Link>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]" data-testid="orders-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Pedido</th>
              <th className="th">Data</th>
              <th className="th">Cliente</th>
              <th className="th">Itens</th>
              <th className="th">Total</th>
              <th className="th">Status</th>
              <th className="th">Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-bone/60">
                <td className="td">
                  <Link href={`/orders/${o.id}`} className="font-mono hover:underline" data-testid={`order-row-${o.id}`}>#{o.number}</Link>
                </td>
                <td className="td text-ink/60">{dateFmt.format(o.createdAt)}</td>
                <td className="td">{o.customerEmail ?? <span className="text-ink/40">—</span>}</td>
                <td className="td font-mono">{o._count.items}</td>
                <td className="td font-mono font-semibold">{formatBRL(o.totalInCents)}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td font-mono text-xs text-ink/70" data-testid={`order-fulfillment-${o.id}`}>
                  {o.status === "PAID" ? FULFILLMENT_LABEL[o.fulfillmentStatus] : "—"}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="td py-14 text-center text-ink/50">Nenhum pedido encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}
