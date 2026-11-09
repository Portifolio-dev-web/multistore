"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { sendShippingUpdate } from "@repo/mail";
import { requireSession } from "@/lib/session";
import { formToObject, fulfillmentSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

export async function updateFulfillment(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = fulfillmentSchema.safeParse({ ...formToObject(formData), notify: formData.get("notify") === "on" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { notify, ...data } = parsed.data;

  const order = await prisma.order.findFirst({ where: { id: orderId, storeId } });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "PAID") return { error: "Só pedidos pagos podem ter a entrega atualizada." };

  const nowShipped = data.fulfillmentStatus === "SHIPPED" && order.fulfillmentStatus !== "SHIPPED";
  const nowDelivered = data.fulfillmentStatus === "DELIVERED" && order.fulfillmentStatus !== "DELIVERED";
  const isShippedOrLater = data.fulfillmentStatus === "SHIPPED" || data.fulfillmentStatus === "DELIVERED";

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        ...data,
        shippedAt: isShippedOrLater ? (order.shippedAt ?? new Date()) : null,
        deliveredAt: data.fulfillmentStatus === "DELIVERED" ? (order.deliveredAt ?? new Date()) : null,
      },
    });
    if (nowShipped) {
      await tx.orderEvent.create({ data: { orderId: order.id, type: "SHIPPED", actor: "MERCHANT", message: "Pedido enviado" } });
    }
    if (nowDelivered) {
      await tx.orderEvent.create({ data: { orderId: order.id, type: "DELIVERED", actor: "MERCHANT", message: "Pedido entregue" } });
    }
  });
  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/orders");

  if (nowShipped && notify) {
    const sent = await sendShippingUpdate(order.id);
    return sent
      ? { success: "Entrega atualizada e cliente avisado por e-mail." }
      : { success: "Entrega atualizada. O e-mail não foi enviado (verifique o SMTP ou o e-mail do cliente)." };
  }
  return { success: "Entrega atualizada." };
}

export async function addOrderNote(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const message = formData.get("message")?.toString().trim();
  if (!message || message.length < 2) return { error: "Escreva uma nota." };

  const order = await prisma.order.findFirst({ where: { id: orderId, storeId }, select: { id: true } });
  if (!order) return { error: "Pedido não encontrado." };

  await prisma.orderEvent.create({ data: { orderId: order.id, type: "NOTE", actor: "MERCHANT", message } });
  revalidatePath(`/orders/${order.id}`);
  return { success: "Nota adicionada." };
}
