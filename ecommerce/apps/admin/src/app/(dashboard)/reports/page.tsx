import { prisma } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

type SearchParams = { from?: string; to?: string };

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { storeId } = await requireSession();

  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : new Date();
  const from = searchParams.from ? new Date(searchParams.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { storeId, status: "PAID", paidAt: { gte: from, lte: to } },
    include: { items: true },
  });

  const revenue = orders.reduce((s, o) => s + o.totalInCents, 0);
  const orderCount = orders.length;
  const avgTicket = orderCount ? Math.round(revenue / orderCount) : 0;

  const byDay = new Map<string, number>();
  for (const o of orders) {
    const day = (o.paidAt ?? o.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + o.totalInCents);
  }
  const salesByDay = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maxDay = Math.max(1, ...salesByDay.map(([, v]) => v));

  const byProduct = new Map<string, { name: string; qty: number; total: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const key = it.productId ?? it.productName;
      const cur = byProduct.get(key) ?? { name: it.productName, qty: 0, total: 0 };
      cur.qty += it.quantity;
      cur.total += it.unitPriceInCents * it.quantity;
      byProduct.set(key, cur);
    }
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  const byCoupon = new Map<string, { count: number; discount: number }>();
  for (const o of orders) {
    if (!o.couponCode) continue;
    const cur = byCoupon.get(o.couponCode) ?? { count: 0, discount: 0 };
    cur.count += 1;
    cur.discount += o.discountInCents;
    byCoupon.set(o.couponCode, cur);
  }
  const topCoupons = [...byCoupon.entries()].sort(([, a], [, b]) => b.count - a.count).slice(0, 10);

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Faturamento, pedidos e o que mais vendeu no período." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3" data-testid="reports-filter-form">
        <div>
          <label className="label" htmlFor="from">De</label>
          <input id="from" name="from" type="date" defaultValue={toInputDate(from)} className="field" data-testid="reports-from-input" />
        </div>
        <div>
          <label className="label" htmlFor="to">Até</label>
          <input id="to" name="to" type="date" defaultValue={toInputDate(to)} className="field" data-testid="reports-to-input" />
        </div>
        <button type="submit" className="btn-outline" data-testid="reports-filter-apply-button">Filtrar</button>
        <a
          href={`/api/orders/export?from=${toInputDate(from)}&to=${toInputDate(to)}`}
          className="btn-ghost"
          data-testid="reports-export-link"
        >
          Exportar CSV
        </a>
      </form>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card p-5"><p className="label">Faturamento</p><p className="mt-2 text-2xl font-semibold" data-testid="report-revenue">{formatBRL(revenue)}</p></div>
        <div className="card p-5"><p className="label">Pedidos pagos</p><p className="mt-2 text-2xl font-semibold" data-testid="report-order-count">{orderCount}</p></div>
        <div className="card p-5"><p className="label">Ticket médio</p><p className="mt-2 text-2xl font-semibold" data-testid="report-avg-ticket">{formatBRL(avgTicket)}</p></div>
        <div className="card p-5"><p className="label">Meio de pagamento</p><p className="mt-2 text-2xl font-semibold" data-testid="report-payment-method">Cartão · 100%</p></div>
      </div>

      <section className="card mt-8 p-5">
        <h2 className="font-semibold">Vendas por dia</h2>
        {salesByDay.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">Nenhuma venda no período.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-1" data-testid="report-sales-by-day">
            {salesByDay.map(([day, value]) => (
              <div key={day} className="flex-1" title={`${day}: ${formatBRL(value)}`}>
                <div className="rounded-t bg-ink" style={{ height: `${Math.max(4, (value / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="font-semibold">Produtos mais vendidos</h2></div>
          <ul className="divide-y divide-line">
            {topProducts.map((p) => (
              <li key={p.name} className="flex justify-between px-5 py-3 text-sm" data-testid={`report-top-product-${p.name}`}>
                <span className="truncate">{p.name}</span>
                <span className="font-mono">{p.qty}× · {formatBRL(p.total)}</span>
              </li>
            ))}
            {topProducts.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/50">Nenhuma venda no período.</li>}
          </ul>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="font-semibold">Cupons mais usados</h2></div>
          <ul className="divide-y divide-line">
            {topCoupons.map(([code, agg]) => (
              <li key={code} className="flex justify-between px-5 py-3 text-sm" data-testid={`report-top-coupon-${code}`}>
                <span className="font-mono">{code}</span>
                <span className="font-mono">{agg.count}× · -{formatBRL(agg.discount)}</span>
              </li>
            ))}
            {topCoupons.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/50">Nenhum cupom usado no período.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
