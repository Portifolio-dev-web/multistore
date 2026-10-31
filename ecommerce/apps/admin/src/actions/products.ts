"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { formToObject, productSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parseProduct(formData: FormData) {
  return productSchema.safeParse({ ...formToObject(formData), active: formData.get("active") === "on" });
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.product.create({ data: { ...parsed.data, storeId } });
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Escopo por loja: um lojista nunca altera produto de outra loja
  const { count } = await prisma.product.updateMany({ where: { id: productId, storeId }, data: parsed.data });
  if (count === 0) return { error: "Produto não encontrado." };

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { success: "Produto atualizado." };
}

export async function deleteProduct(productId: string): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.product.deleteMany({ where: { id: productId, storeId } });
  revalidatePath("/products");
  redirect("/products");
}
