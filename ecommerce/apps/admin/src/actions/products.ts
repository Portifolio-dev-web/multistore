"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { slugify } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { formToObject, productSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    ...formToObject(formData),
    categoryIds: formData.getAll("categoryIds"),
    active: formData.get("active") === "on",
  });
}

/** slugify(name ou o texto digitado) + sufixo numérico se já existir outro produto com o mesmo slug */
async function resolveUniqueSlug(storeId: string, base: string, excludeProductId?: string): Promise<string> {
  let slug = base || "produto";
  for (let n = 2; await prisma.product.findFirst({ where: { storeId, slug, id: { not: excludeProductId } } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, categoryIds, ...data } = parsed.data;

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.name));

  await prisma.$transaction(async (tx) => {
    // Nunca confia em categoryIds vindo do formulário: só conecta categorias da própria loja
    const categories = await tx.category.findMany({ where: { id: { in: categoryIds }, storeId }, select: { id: true } });
    await tx.product.create({ data: { ...data, slug, storeId, categories: { connect: categories } } });
    await tx.slugRedirect.deleteMany({ where: { storeId, fromSlug: slug } });
  });
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseProduct(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, categoryIds, ...data } = parsed.data;

  // Escopo por loja: um lojista nunca altera produto de outra loja
  const existing = await prisma.product.findFirst({ where: { id: productId, storeId }, select: { slug: true } });
  if (!existing) return { error: "Produto não encontrado." };

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.name), productId);

  await prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({ where: { id: { in: categoryIds }, storeId }, select: { id: true } });
    // `update` (não `updateMany`) porque precisa mexer na relação `categories`; a posse já foi
    // confirmada acima pelo `findFirst` filtrado por storeId.
    await tx.product.update({ where: { id: productId }, data: { ...data, slug, categories: { set: categories } } });
    await tx.slugRedirect.deleteMany({ where: { storeId, fromSlug: slug } });
    if (existing.slug !== slug) {
      await tx.slugRedirect.upsert({
        where: { storeId_fromSlug: { storeId, fromSlug: existing.slug } },
        create: { storeId, fromSlug: existing.slug, productId },
        update: { productId },
      });
    }
  });

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
