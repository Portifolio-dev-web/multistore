import type Stripe from "stripe";
import { prisma, type OrderStatus } from "@repo/db";

/** Marca o pedido como PAID (idempotente) e baixa o estoque uma única vez */
export async function markOrderPaid(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== "paid") return;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        customerEmail: session.customer_details?.email ?? undefined,
        customerName: session.customer_details?.name ?? undefined,
      },
    });
    if (count === 0) return;

    const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId! }, data: { stock: { decrement: item.quantity } } });
      await tx.product.updateMany({ where: { id: item.productId!, stock: { lt: 0 } }, data: { stock: 0 } });
    }
  });
}

export async function setOrderStatus(session: Stripe.Checkout.Session, status: Exclude<OrderStatus, "PAID">) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status } });
}
