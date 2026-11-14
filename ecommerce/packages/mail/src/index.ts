import { prisma } from "@repo/db";
import { orderTrackingUrl } from "@repo/db/urls";
import { sendMail } from "./transport";
import {
  abandonedCartEmail,
  customerLoginLinkEmail,
  deliveryConfirmationEmail,
  emailVerificationEmail,
  newSaleNoticeEmail,
  orderCanceledEmail,
  orderConfirmationEmail,
  orderReceivedEmail,
  orderRefundedEmail,
  passwordResetEmail,
  planPastDueEmail,
  reviewRequestEmail,
  shippingUpdateEmail,
  teamAddedEmail,
  teamInviteEmail,
} from "./templates";

type StoreTheme = { name: string; primaryColor: string; accentColor: string; logoUrl: string | null };

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

/** F5.4: pedido criado, aguardando confirmação de pagamento assíncrono (Pix/boleto no Stripe) */
export async function sendOrderReceivedNotice(orderId: string): Promise<void> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, receivedEmailSentAt: null, customerEmail: { not: null } },
    data: { receivedEmailSentAt: new Date() },
  });
  if (count === 0) return;

  const order = await loadOrder(orderId);
  if (!order?.customerEmail) return;

  try {
    const mail = orderReceivedEmail({
      store: order.store,
      code: String(order.number),
      customerName: order.customerName,
      items: order.items,
      totalInCents: order.totalInCents,
      shippingAddress: order.shippingAddress,
      orderUrl: orderTrackingUrl(order.store, order.publicToken),
    });
    const sent = await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
    if (!sent) await prisma.order.update({ where: { id: orderId }, data: { receivedEmailSentAt: null } });
  } catch (err) {
    console.error("[mail] falha no aviso de pedido recebido", orderId, err);
    await prisma.order.update({ where: { id: orderId }, data: { receivedEmailSentAt: null } });
  }
}

/** F5.4/F6.2: avisa o OWNER mais antigo da loja (equipe pode ter várias pessoas desde a F6.2) */
export async function sendNewSaleNotice(orderId: string): Promise<void> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "PAID", merchantNotifiedAt: null },
    data: { merchantNotifiedAt: new Date() },
  });
  if (count === 0) return;

  const order = await loadOrder(orderId);
  if (!order) return;
  const membership = await prisma.membership.findFirst({
    where: { storeId: order.storeId, role: "OWNER" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const merchant = membership?.user;
  if (!merchant) return;

  try {
    const adminOrderUrl = `${process.env.ADMIN_URL ?? "http://localhost:3001"}/orders/${order.id}`;
    const mail = newSaleNoticeEmail({ store: order.store, code: String(order.number), totalInCents: order.totalInCents, items: order.items, adminOrderUrl });
    const sent = await sendMail({ ...mail, to: merchant.email, fromName: order.store.name });
    if (!sent) await prisma.order.update({ where: { id: orderId }, data: { merchantNotifiedAt: null } });
  } catch (err) {
    console.error("[mail] falha no aviso de nova venda", orderId, err);
    await prisma.order.update({ where: { id: orderId }, data: { merchantNotifiedAt: null } });
  }
}

/** F5.4: cancelamento/reembolso — chamados pelo admin (merchant-iniciado); idempotência é a troca de status em si */
export async function sendOrderCanceled(orderId: string): Promise<boolean> {
  const order = await loadOrder(orderId);
  if (!order?.customerEmail) return false;
  try {
    const mail = orderCanceledEmail({ store: order.store, code: String(order.number), orderUrl: orderTrackingUrl(order.store, order.publicToken) });
    return await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
  } catch (err) {
    console.error("[mail] falha no aviso de cancelamento", orderId, err);
    return false;
  }
}

export async function sendOrderRefunded(orderId: string): Promise<boolean> {
  const order = await loadOrder(orderId);
  if (!order?.customerEmail) return false;
  try {
    const mail = orderRefundedEmail({
      store: order.store,
      code: String(order.number),
      totalInCents: order.totalInCents,
      orderUrl: orderTrackingUrl(order.store, order.publicToken),
    });
    return await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
  } catch (err) {
    console.error("[mail] falha no aviso de reembolso", orderId, err);
    return false;
  }
}

/** F5.4: confirma a entrega — o pedido de avaliação com link assinado continua só no cron de F3.6 */
export async function sendDeliveryConfirmation(orderId: string): Promise<boolean> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, deliveryEmailSentAt: null, customerEmail: { not: null } },
    data: { deliveryEmailSentAt: new Date() },
  });
  if (count === 0) return false;

  const order = await loadOrder(orderId);
  if (!order?.customerEmail) return false;
  try {
    const mail = deliveryConfirmationEmail({ store: order.store, code: String(order.number), orderUrl: orderTrackingUrl(order.store, order.publicToken) });
    const sent = await sendMail({ ...mail, to: order.customerEmail, fromName: order.store.name });
    if (!sent) await prisma.order.update({ where: { id: orderId }, data: { deliveryEmailSentAt: null } });
    return sent;
  } catch (err) {
    console.error("[mail] falha na confirmação de entrega", orderId, err);
    await prisma.order.update({ where: { id: orderId }, data: { deliveryEmailSentAt: null } });
    return false;
  }
}

/** F6.1: e-mails de conta (não há `to` implícito aqui — quem chama já resolveu o e-mail do User) */
export async function sendPasswordReset(to: string, name: string | null, resetUrl: string): Promise<boolean> {
  try {
    const mail = passwordResetEmail({ name, resetUrl });
    return await sendMail({ ...mail, to, fromName: "MultiStore" });
  } catch (err) {
    console.error("[mail] falha no e-mail de redefinição de senha", to, err);
    return false;
  }
}

export async function sendEmailVerification(to: string, name: string | null, verifyUrl: string): Promise<boolean> {
  try {
    const mail = emailVerificationEmail({ name, verifyUrl });
    return await sendMail({ ...mail, to, fromName: "MultiStore" });
  } catch (err) {
    console.error("[mail] falha no e-mail de verificação", to, err);
    return false;
  }
}

/** F6.2: convite (usuário novo, ainda sem senha) vs. aviso (usuário existente, só ganhou acesso a mais uma loja) */
export async function sendTeamInvite(store: StoreTheme, to: string, roleLabel: string, acceptUrl: string): Promise<boolean> {
  try {
    const mail = teamInviteEmail({ store, roleLabel, acceptUrl });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no convite de equipe", to, err);
    return false;
  }
}

export async function sendTeamAdded(store: StoreTheme, to: string, roleLabel: string, loginUrl: string): Promise<boolean> {
  try {
    const mail = teamAddedEmail({ store, roleLabel, loginUrl });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no aviso de equipe", to, err);
    return false;
  }
}

/** F6.3: aviso de cobrança recusada (webhook do Stripe Billing) */
export async function sendPlanPastDue(store: StoreTheme, to: string, planLabel: string, billingUrl: string): Promise<boolean> {
  try {
    const mail = planPastDueEmail({ store, planLabel, billingUrl });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no aviso de cobrança atrasada", to, err);
    return false;
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

/** F3.1: a chamada já recebe o link pronto (token gerado e salvo pelo chamador) — só envia. */
export async function sendCustomerLoginLink(store: StoreTheme, to: string, loginUrl: string): Promise<boolean> {
  try {
    const mail = customerLoginLinkEmail({ store, loginUrl });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no link de login", to, err);
    return false;
  }
}

type AbandonedCartItem = { productName: string; quantity: number; unitPriceInCents: number };

/** F3.4: idempotência (remindedAt1h/24h) é controlada pelo chamador, não aqui. */
export async function sendAbandonedCartReminder(
  store: StoreTheme,
  to: string,
  items: AbandonedCartItem[],
  recoverUrl: string,
  unsubscribeUrl: string,
): Promise<boolean> {
  try {
    const mail = abandonedCartEmail({ store, recoverUrl, unsubscribeUrl, items });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no lembrete de carrinho abandonado", to, err);
    return false;
  }
}

/** F3.6: idempotência (Order.reviewRequestSentAt) é controlada pelo chamador. */
export async function sendReviewRequest(store: StoreTheme, to: string, code: string, productName: string, reviewUrl: string): Promise<boolean> {
  try {
    const mail = reviewRequestEmail({ store, code, productName, reviewUrl });
    return await sendMail({ ...mail, to, fromName: store.name });
  } catch (err) {
    console.error("[mail] falha no pedido de avaliação", to, err);
    return false;
  }
}
