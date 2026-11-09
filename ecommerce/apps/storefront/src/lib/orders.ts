import type Stripe from "stripe";
import { prisma, releaseStock, type OrderStatus, type Prisma } from "@repo/db";
import { sendOrderConfirmation } from "@repo/mail";

// setOrderStatus só é chamado com FAILED/EXPIRED/CANCELED na prática (PENDING nunca acontece,
// mas entra no tipo porque o parâmetro é Exclude<OrderStatus, "PAID">)
const STATUS_EVENT: Record<Exclude<OrderStatus, "PAID">, { type: "FAILED" | "EXPIRED" | "CANCELED"; message: string } | null> = {
  PENDING: null,
  FAILED: { type: "FAILED", message: "Pagamento falhou" },
  EXPIRED: { type: "EXPIRED", message: "Sessão de pagamento expirou" },
  CANCELED: { type: "CANCELED", message: "Pedido cancelado" },
};

/** Marca o pedido como PAID (idempotente) e envia a confirmação. O estoque já foi reservado na criação. */
export async function markOrderPaid(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== "paid") return;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const shipping = session.shipping_details ?? null;

  const { count } = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        customerEmail: session.customer_details?.email ?? undefined,
        customerName: session.customer_details?.name ?? undefined,
        shippingAddress: shipping ? (shipping as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
    if (result.count > 0) {
      await tx.orderEvent.create({ data: { orderId, type: "PAID", actor: "SYSTEM", message: "Pagamento confirmado" } });
    }
    return result;
  });

  // Falha de e-mail nunca derruba o webhook
  if (count > 0) await sendOrderConfirmation(orderId).catch((err) => console.error("[mail]", err));
}

/** Expirado, falhou ou cancelado: muda o status (só a partir de PENDING) e devolve o estoque reservado. */
export async function setOrderStatus(session: Stripe.Checkout.Session, status: Exclude<OrderStatus, "PAID">) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status } });
    if (count > 0) {
      await releaseStock(tx, orderId);
      const event = STATUS_EVENT[status];
      if (event) await tx.orderEvent.create({ data: { orderId, actor: "SYSTEM", ...event } });
    }
  });
}
