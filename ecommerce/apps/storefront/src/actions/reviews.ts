"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { verifyReviewToken } from "@/lib/review-token";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Escreva pelo menos 10 caracteres").max(2000),
  authorName: z.string().trim().min(2, "Informe seu nome").max(80),
  orderId: z.string().trim().optional(),
  token: z.string().trim().optional(),
});

export type ReviewFormState = { error?: string; success?: boolean };

export async function createReview(storeSlug: string, productId: string, _prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { rating, text, authorName, orderId, token } = parsed.data;

  const store = await getStoreBySlug(storeSlug);
  if (!store) return { error: "Loja não encontrada." };

  const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id }, select: { id: true } });
  if (!product) return { error: "Produto não encontrado." };

  let verifiedPurchase = false;
  let verifiedOrderId: string | null = null;
  if (orderId && token && verifyReviewToken(orderId, productId, token)) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId: store.id, deliveredAt: { not: null }, items: { some: { productId } } },
      select: { id: true },
    });
    if (order) {
      verifiedPurchase = true;
      verifiedOrderId = order.id;
    }
  }

  const session = await getCustomerForStore(store.id);

  await prisma.review.create({
    data: {
      storeId: store.id,
      productId,
      orderId: verifiedOrderId,
      customerId: session?.customerId ?? null,
      rating,
      text,
      authorName,
      verifiedPurchase,
      approved: false,
    },
  });

  revalidatePath(`/${storeSlug}/produtos`);
  return { success: true };
}
