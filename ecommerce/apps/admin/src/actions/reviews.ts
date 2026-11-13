"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";

export async function approveReview(reviewId: string): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.review.updateMany({ where: { id: reviewId, storeId }, data: { approved: true } });
  revalidatePath("/reviews");
}

export async function rejectReview(reviewId: string): Promise<void> {
  const { storeId } = await requireSession();
  // "Rejeitar" remove de vez — não existe estado "reprovado" separado de "excluído" no roadmap
  await prisma.review.deleteMany({ where: { id: reviewId, storeId } });
  revalidatePath("/reviews");
}
