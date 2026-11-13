"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { couponSchema, formToObject } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parseCoupon(formData: FormData) {
  return couponSchema.safeParse({ ...formToObject(formData), active: formData.get("active") === "on" });
}

export async function createCoupon(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseCoupon(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code: parsed.data.code } } });
  if (existing) return { fieldErrors: { code: ["Já existe um cupom com este código"] } };

  await prisma.coupon.create({ data: { ...parsed.data, storeId } });
  revalidatePath("/coupons");
  redirect("/coupons");
}

export async function updateCoupon(couponId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseCoupon(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.coupon.findFirst({ where: { id: couponId, storeId } });
  if (!existing) return { error: "Cupom não encontrado." };

  const codeOwner = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code: parsed.data.code } } });
  if (codeOwner && codeOwner.id !== couponId) return { fieldErrors: { code: ["Já existe um cupom com este código"] } };

  await prisma.coupon.updateMany({ where: { id: couponId, storeId }, data: parsed.data });
  revalidatePath("/coupons");
  revalidatePath(`/coupons/${couponId}`);
  return { success: "Cupom atualizado." };
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.coupon.deleteMany({ where: { id: couponId, storeId } });
  revalidatePath("/coupons");
  redirect("/coupons");
}
