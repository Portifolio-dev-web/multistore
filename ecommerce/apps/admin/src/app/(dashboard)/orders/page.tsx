import Link from "next/link";
import { prisma, OrderStatus } from "@repo/db";
import { formatBRL, FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const { storeId } = await requireSession();
  const status = Object.values(OrderStatus).find((s) => s === searchParams.status);

  const orders = await prisma.order.findMany({
    where: { storeId, ...(status && { status }) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });

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
    </>
  );
}
