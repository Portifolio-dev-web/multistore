import { prisma } from "@repo/db";
import { orderTrackingUrl } from "@repo/db/urls";
import { sendMail } from "./transport";
import { orderConfirmationEmail, shippingUpdateEmail } from "./templates";

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, store: true } });
}

/** Envia a confirmação uma única vez por pedido (trava atômica em confirmationEmailSentAt) */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "PAID", confirmationEmailSentAt: null, customerEmail: { not: null } },
    data: { confirmationEmailSentAt: new Date() },
  });
  if (count === 0) return;

  const order = await loadOrder(orderId);
  if (!order?.customerEmail) return;

  try {
    const mail = orderConfirmationEmail({
      store: order.store,
      code: String(order.number),
      customerName: order.customerName,
      items: order.items,
      totalInCents: order.totalInCents,
      shippingAddress: order.shippingAddress,
      orderUrl: orderTrackingUrl(order.store, order.publicToken),
    });
    const sent = await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
    if (sent) {
      await prisma.orderEvent.create({
        data: { orderId, type: "EMAIL_SENT", actor: "SYSTEM", message: "E-mail de confirmação enviado" },
      });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { confirmationEmailSentAt: null } });
    }
  } catch (err) {
    console.error("[mail] falha na confirmação do pedido", orderId, err);
    await prisma.order.update({ where: { id: orderId }, data: { confirmationEmailSentAt: null } });
  }
}

export async function sendShippingUpdate(orderId: string): Promise<boolean> {
  const order = await loadOrder(orderId);
  if (!order?.customerEmail || !order.trackingCode) return false;
  try {
    const mail = shippingUpdateEmail({
      store: order.store,
      code: String(order.number),
      carrier: order.carrier,
      trackingCode: order.trackingCode,
      trackingUrl: order.trackingUrl,
      orderUrl: orderTrackingUrl(order.store, order.publicToken),
    });
    const sent = await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
    if (sent) {
      await prisma.orderEvent.create({
        data: { orderId, type: "EMAIL_SENT", actor: "SYSTEM", message: "E-mail de rastreio enviado" },
      });
    }
    return sent;
  } catch (err) {
    console.error("[mail] falha no aviso de envio", orderId, err);
    return false;
  }
}
