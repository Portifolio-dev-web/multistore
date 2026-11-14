import Link from "next/link";
import { prisma } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export default async function OverviewPage() {
  const { storeId } = await requireSession();

  const [revenue, paidCount, pendingCount, productCount, lowStock, recent, store] = await Promise.all([
    prisma.order.aggregate({ where: { storeId, status: "PAID" }, _sum: { totalInCents: true } }),
    prisma.order.count({ where: { storeId, status: "PAID" } }),
    prisma.order.count({ where: { storeId, status: "PENDING" } }),
    prisma.product.count({ where: { storeId } }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 3 }, product: { storeId, active: true } },
      orderBy: { stock: "asc" },
      take: 5,
      include: { product: { select: { id: true, name: true } } },
    }),
    prisma.order.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.store.findUnique({ where: { id: storeId }, select: { logoUrl: true, domainStatus: true, onboardingDismissedAt: true } }),
  ]);

  const stats = [
    { label: "Receita paga", value: formatBRL(revenue._sum.totalInCents ?? 0), id: "revenue", highlight: true },
    { label: "Pedidos pagos", value: paidCount, id: "paid-orders" },
    { label: "Aguardando", value: pendingCount, id: "pending-orders" },
    { label: "Produtos", value: productCount, id: "products" },
  ];

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Resumo da sua loja em tempo real." />
      {!store?.onboardingDismissedAt && (
        <OnboardingChecklist hasProduct={productCount > 0} hasLogo={!!store?.logoUrl} domainVerified={store?.domainStatus === "VERIFIED"} />
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.id} className={`card p-5 animate-rise ${s.highlight ? "border-ink bg-ink text-bone" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
            <p className={`font-mono text-[11px] uppercase tracking-[0.12em] ${s.highlight ? "text-lime" : "text-ink/50"}`}>{s.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" data-testid={`stat-${s.id}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Pedidos recentes</h2>
            <Link href="/orders" className="font-mono text-xs underline underline-offset-4" data-testid="overview-all-orders-link">ver todos</Link>
          </div>
          <ul className="divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-bone/60" data-testid={`overview-order-${o.id}`}>
                  <span className="font-mono text-sm">#{o.number}</span>
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-semibold">{formatBRL(o.totalInCents)}</span>
                </Link>
              </li>
            ))}
            {recent.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/50">Nenhum pedido ainda.</li>}
          </ul>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Estoque baixo</h2>
          </div>
          <ul className="divide-y divide-line">
            {lowStock.map((v) => (
              <li key={v.id}>
                <Link href={`/products/${v.product.id}`} className="flex justify-between px-5 py-3.5 text-sm hover:bg-bone/60" data-testid={`low-stock-${v.product.id}`}>
                  <span className="truncate">{v.product.name}</span>
                  <span className={`font-mono ${v.stock === 0 ? "text-red-700" : ""}`}>{v.stock} un.</span>
                </Link>
              </li>
            ))}
            {lowStock.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/50">Tudo abastecido.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
