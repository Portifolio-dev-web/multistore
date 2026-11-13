"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { promotionSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parsePromotion(formData: FormData) {
  return promotionSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    buyQuantity: formData.get("buyQuantity") || undefined,
    payQuantity: formData.get("payQuantity") || undefined,
    minQuantity: formData.get("minQuantity") || undefined,
    percentOff: formData.get("percentOff") || undefined,
    productIds: formData.getAll("productIds"),
    active: formData.get("active") === "on",
  });
}

export async function createPromotion(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parsePromotion(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.promotion.create({ data: { ...parsed.data, storeId } });
  revalidatePath("/promotions");
  redirect("/promotions");
}

export async function updatePromotion(promotionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parsePromotion(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.promotion.findFirst({ where: { id: promotionId, storeId } });
  if (!existing) return { error: "Promoção não encontrada." };

  await prisma.promotion.updateMany({ where: { id: promotionId, storeId }, data: parsed.data });
  revalidatePath("/promotions");
  revalidatePath(`/promotions/${promotionId}`);
  return { success: "Promoção atualizada." };
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.promotion.deleteMany({ where: { id: promotionId, storeId } });
  revalidatePath("/promotions");
  redirect("/promotions");
}
