import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type Stripe from "stripe";
import { prisma } from "@repo/db";
import { formatBRL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { getStripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/orders";
import { ClearCart } from "@/components/clear-cart";

type Props = { params: { store: string }; searchParams: { session_id?: string } };

export default async function CheckoutSuccess({ params, searchParams }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();
  if (!searchParams.session_id) redirect(`/${store.slug}`);

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(searchParams.session_id);
  } catch {
    notFound();
  }

  // Fallback caso o webhook ainda não tenha chegado (operação idempotente)
  await markOrderPaid(session);

  const order = await prisma.order.findFirst({
    where: { id: session.metadata?.orderId ?? "", storeId: store.id },
    include: { items: true },
  });
  if (!order) notFound();
  const base = getStoreBase(store.slug);

  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8">
      {order.status === "PAID" && <ClearCart storeSlug={store.slug} />}
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-2xl text-ink">✓</span>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">Obrigado pela compra!</h1>
      <p className="mt-3 text-ink/60">
        Pedido <span className="font-mono text-ink" data-testid="success-order-id">#{order.id.slice(-8).toUpperCase()}</span> ·{" "}
        <span className="font-semibold text-ink" data-testid="success-order-status">{ORDER_STATUS_LABEL[order.status]}</span>
      </p>
      {order.status !== "PAID" && (
        <p className="mt-2 text-sm text-ink/50">Seu pagamento está sendo processado. Você receberá a confirmação em breve.</p>
      )}
      <ul className="mt-10 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white text-left">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between p-4 text-sm">
            <span>{it.quantity}× {it.productName}</span>
            <span>{formatBRL(it.unitPriceInCents * it.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between p-4 font-semibold">
          <span>Total</span>
          <span data-testid="success-order-total">{formatBRL(order.totalInCents)}</span>
        </li>
      </ul>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href={storeHref(base, `/pedido/${order.publicToken}`)} className="btn-brand" data-testid="success-track-order">Acompanhar pedido</Link>
        <Link href={storeHref(base)} className="btn-ghost" data-testid="success-back-to-store">Continuar comprando</Link>
      </div>
    </div>
  );
}
