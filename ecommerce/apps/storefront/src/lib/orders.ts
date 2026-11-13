import type Stripe from "stripe";
import { prisma, releaseStock, type OrderStatus, type Prisma } from "@repo/db";
import { sendNewSaleNotice, sendOrderConfirmation, sendOrderReceivedNotice } from "@repo/mail";

// setOrderStatus só é chamado com FAILED/EXPIRED na prática (o resto entra no tipo porque o
// parâmetro é Exclude<OrderStatus, "PAID"> — CANCELED/REFUNDED são merchant-iniciados, ver actions/orders.ts no admin)
const STATUS_EVENT: Record<Exclude<OrderStatus, "PAID">, { type: "FAILED" | "EXPIRED" | "CANCELED" | "REFUNDED"; message: string } | null> = {
  PENDING: null,
  FAILED: { type: "FAILED", message: "Pagamento falhou" },
  EXPIRED: { type: "EXPIRED", message: "Sessão de pagamento expirou" },
  CANCELED: { type: "CANCELED", message: "Pedido cancelado" },
  REFUNDED: null,
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
      // F3.2: uso do cupom só conta quando o pedido é de fato pago (idempotente — esta
      // transação só roda uma vez por pedido, graças ao updateMany acima com status != PAID)
      const paid = await tx.order.findUnique({ where: { id: orderId }, select: { storeId: true, couponCode: true, customerEmail: true } });
      if (paid?.couponCode) {
        await tx.coupon.updateMany({ where: { storeId: paid.storeId, code: paid.couponCode }, data: { usesCount: { increment: 1 } } });
      }
      // F3.4: pedido pago para de receber lembrete de carrinho abandonado
      if (paid?.customerEmail) {
        await tx.abandonedCart.updateMany({
          where: { storeId: paid.storeId, email: paid.customerEmail, recoveredOrderId: null },
          data: { recoveredOrderId: orderId },
        });
      }
    }
    return result;
  });

  // Falha de e-mail nunca derruba o webhook
  if (count > 0) {
    await sendOrderConfirmation(orderId).catch((err) => console.error("[mail]", err));
    await sendNewSaleNotice(orderId).catch((err) => console.error("[mail]", err));
  }
}

/** F5.4: Pix/boleto fica "pendente" entre o checkout.session.completed e a confirmação assíncrona */
export async function notifyOrderReceived(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await sendOrderReceivedNotice(orderId).catch((err) => console.error("[mail]", err));
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
