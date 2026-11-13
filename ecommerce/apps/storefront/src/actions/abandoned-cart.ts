"use server";

import { prisma, type Prisma } from "@repo/db";

type AbandonedItem = { variantId: string; productName: string; variantLabel: string | null; unitPriceInCents: number; quantity: number };

/** Chamado quando o cliente informa e-mail no checkout mas ainda não pagou — silencioso (nunca bloqueia o checkout). */
export async function saveAbandonedCart(
  storeSlug: string,
  data: { email: string; name: string; phone: string; items: AbandonedItem[] },
): Promise<void> {
  try {
    const store = await prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true } });
    if (!store || data.items.length === 0) return;

    const existing = await prisma.abandonedCart.findFirst({
      where: { storeId: store.id, email: data.email, recoveredOrderId: null },
      orderBy: { createdAt: "desc" },
    });

    const items = data.items as unknown as Prisma.InputJsonValue;
    if (existing) {
      await prisma.abandonedCart.update({
        where: { id: existing.id },
        data: { name: data.name, phone: data.phone, items, remindedAt1h: null, remindedAt24h: null },
      });
    } else {
      await prisma.abandonedCart.create({
        data: { storeId: store.id, email: data.email, name: data.name, phone: data.phone, items },
      });
    }
  } catch (err) {
    console.error("[abandoned-cart] falha ao salvar", storeSlug, err);
  }
}
