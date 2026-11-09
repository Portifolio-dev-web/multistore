import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, type Order } from "@repo/db";
import { formatAddress, formatBRL, FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";

type Props = { params: { store: string; token: string } };

const UUID = /^[0-9a-f-]{36}$/i;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export const metadata = { robots: { index: false } };

function steps(order: Order) {
  const rank = { UNFULFILLED: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 }[order.fulfillmentStatus];
  return [
    { label: "Pedido recebido", done: true, at: order.createdAt },
    { label: "Pagamento confirmado", done: order.status === "PAID", at: order.paidAt },
    { label: FULFILLMENT_LABEL.PROCESSING, done: order.status === "PAID" && rank >= 1, at: null },
    { label: FULFILLMENT_LABEL.SHIPPED, done: rank >= 2, at: order.shippedAt },
    { label: FULFILLMENT_LABEL.DELIVERED, done: rank >= 3, at: order.deliveredAt },
  ];
}

export default async function OrderTrackingPage({ params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store || !UUID.test(params.token)) notFound();

  const order = await prisma.order.findFirst({
    where: { publicToken: params.token, storeId: store.id },
    include: { items: true, events: { where: { type: { not: "NOTE" } }, orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const address = formatAddress(order.shippingAddress);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <p className="label">Pedido #{order.number}</p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl" data-testid="tracking-title">
        {order.status === "PAID" ? FULFILLMENT_LABEL[order.fulfillmentStatus] : ORDER_STATUS_LABEL[order.status]}
      </h1>

      <ol className="mt-10 space-y-0" data-testid="tracking-timeline">
        {steps(order).map((s, i, all) => (
          <li key={s.label} className="relative flex gap-4 pb-7 last:pb-0">
            {i < all.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${all[i + 1].done ? "bg-brand" : "bg-ink/10"}`} />}
            <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${s.done ? "bg-brand text-brand-contrast" : "border-2 border-ink/15 bg-paper"}`}>
              {s.done ? "✓" : ""}
            </span>
            <div>
              <p className={`font-medium ${s.done ? "" : "text-ink/40"}`}>{s.label}</p>
              {s.done && s.at && <p className="text-xs text-ink/50">{dateFmt.format(s.at)}</p>}
            </div>
          </li>
        ))}
      </ol>

      {order.trackingCode && (
        <div className="mt-10 rounded-3xl bg-brand p-6 text-brand-contrast" data-testid="tracking-code-card">
          <p className="text-xs uppercase tracking-[0.14em] opacity-70">Código de rastreio{order.carrier ? ` · ${order.carrier}` : ""}</p>
          <p className="mt-2 break-all font-mono text-2xl font-bold tracking-wider" data-testid="tracking-code">{order.trackingCode}</p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink" data-testid="tracking-carrier-link">
              Rastrear na transportadora ↗
            </a>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        <ul className="divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3 p-4 text-sm">
              <span>{it.quantity}× {it.productName}</span>
              <span>{formatBRL(it.unitPriceInCents * it.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between p-4 font-semibold">
            <span>Total</span>
            <span data-testid="tracking-total">{formatBRL(order.totalInCents)}</span>
          </li>
        </ul>
        {address.length > 0 && (
          <div className="rounded-3xl border border-ink/10 bg-white p-5 text-sm leading-relaxed">
            <p className="label">Entrega em</p>
            {address.map((l) => <p key={l}>{l}</p>)}
          </div>
        )}
      </div>

      {order.events.length > 0 && (
        <div className="mt-10 rounded-3xl border border-ink/10 bg-white p-5 text-sm" data-testid="tracking-history">
          <p className="label mb-3">Histórico</p>
          <ul className="space-y-2">
            {order.events.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 text-ink/70">
                <span>{e.message}</span>
                <span className="shrink-0 font-mono text-xs text-ink/40">{dateFmt.format(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={storeHref(getStoreBase(store.slug))} className="btn-ghost mt-10" data-testid="tracking-back-to-store">Voltar à loja</Link>
    </div>
  );
}
