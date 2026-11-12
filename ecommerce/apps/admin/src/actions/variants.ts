"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { cartesianCombinations, combinationKey } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { formToObject, productOptionsSchema, productVariantsSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

export async function updateProductOptions(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  // Escopo por loja: um lojista nunca mexe nas opções de produto de outra loja
  const product = await prisma.product.findFirst({ where: { id: productId, storeId }, include: { variants: true } });
  if (!product) return { error: "Produto não encontrado." };

  const parsed = productOptionsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: "Opções inválidas." };
  const options = parsed.data.optionsJson;

  const validCombos = cartesianCombinations(options);
  const validKeys = new Set(validCombos.map(combinationKey));
  const existingByKey = new Map(product.variants.map((v) => [combinationKey(v.combination as Record<string, string>), v]));
  const toCreate = validCombos.filter((c) => !existingByKey.has(combinationKey(c)));
  const toDelete = product.variants.filter((v) => !validKeys.has(combinationKey(v.combination as Record<string, string>)));

  await prisma.$transaction(async (tx) => {
    await tx.productOption.deleteMany({ where: { productId } });
    if (options.length > 0) {
      await tx.productOption.createMany({
        data: options.map((o, position) => ({ productId, name: o.name, values: o.values, position })),
      });
    }
    if (toDelete.length > 0) {
      await tx.productVariant.deleteMany({ where: { id: { in: toDelete.map((v) => v.id) } } });
    }
    for (const [i, combination] of toCreate.entries()) {
      await tx.productVariant.create({ data: { productId, combination, position: product.variants.length + i } });
    }
  });

  revalidatePath(`/products/${productId}/variants`);
  revalidatePath(`/products/${productId}`);
  return { success: "Opções salvas." };
}

export async function updateProductVariants(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const product = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true } });
  if (!product) return { error: "Produto não encontrado." };

  const parsed = productVariantsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: "Dados inválidos." };

  await prisma.$transaction(async (tx) => {
    for (const v of parsed.data.variantsJson) {
      // Nunca confia no id vindo do formulário sem checar a posse (via productId da própria loja)
      await tx.productVariant.updateMany({
        where: { id: v.id, productId },
        data: { sku: v.sku, priceInCents: v.priceInCents, compareAtPriceInCents: v.compareAtPriceInCents, stock: v.stock },
      });
    }
  });

  revalidatePath(`/products/${productId}/variants`);
  revalidatePath(`/products/${productId}`);
  return { success: "Variações atualizadas." };
}
