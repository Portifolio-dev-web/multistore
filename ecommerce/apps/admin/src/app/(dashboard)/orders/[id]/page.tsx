import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { formatAddress, formatBRL } from "@repo/db/utils";
import { orderTrackingUrl } from "@repo/db/urls";
import { requireSession } from "@/lib/session";
import { updateFulfillment } from "@/actions/orders";
import { FulfillmentForm } from "@/components/fulfillment-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" });

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const order = await prisma.order.findFirst({ where: { id: params.id, storeId }, include: { items: true, store: true } });
  if (!order) notFound();
  const address = formatAddress(order.shippingAddress);
  const trackingPage = orderTrackingUrl(order.store, order.publicToken);

  const meta = [
    { label: "Criado em", value: dateFmt.format(order.createdAt) },
    { label: "Pago em", value: order.paidAt ? dateFmt.format(order.paidAt) : "—" },
    { label: "Cliente", value: order.customerName ?? "—" },
    { label: "E-mail", value: order.customerEmail ?? "—" },
    { label: "Telefone", value: order.customerPhone ?? "—" },
    { label: "CPF/CNPJ", value: order.customerDocument ?? "—" },
    { label: "Endereço de entrega", value: address.length ? address.join(" · ") : "—" },
    { label: "Sessão Stripe", value: order.stripeSessionId ?? "—", mono: true },
    { label: "Payment Intent", value: order.stripePaymentIntentId ?? "—", mono: true },
  ];

  return (
    <>
      <Link href="/orders" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-orders-link">← pedidos</Link>
      <PageHeader title={`Pedido #${order.number}`} action={<StatusBadge status={order.status} testId="order-detail-status" />} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Item</th>
                <th className="th">Qtd.</th>
                <th className="th text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="td">
                    {it.productName}
                    <span className="block font-mono text-xs text-ink/50">{formatBRL(it.unitPriceInCents)} un.</span>
                  </td>
                  <td className="td font-mono">{it.quantity}</td>
                  <td className="td text-right font-mono">{formatBRL(it.unitPriceInCents * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-ink">
              <tr>
                <td className="td font-semibold" colSpan={2}>Total</td>
                <td className="td text-right font-mono text-lg font-semibold" data-testid="order-detail-total">{formatBRL(order.totalInCents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
        <section className="space-y-6">
        <FulfillmentForm action={updateFulfillment.bind(null, order.id)} order={order} />
        <section className="card divide-y divide-line">
          <div className="px-5 py-3.5">
            <p className="label mb-0.5">Página do cliente</p>
            <a href={trackingPage} target="_blank" rel="noreferrer" className="break-all font-mono text-xs underline underline-offset-4" data-testid="order-tracking-page-link">{trackingPage}</a>
          </div>
          {meta.map((m) => (
            <div key={m.label} className="px-5 py-3.5">
              <p className="label mb-0.5">{m.label}</p>
              <p className={`break-all text-sm ${m.mono ? "font-mono text-xs" : ""}`}>{m.value}</p>
            </div>
          ))}
        </section>
        </section>
      </div>
    </>
  );
}
