"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { categoryAncestors, slugify } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { categorySchema, formToObject } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parseCategory(formData: FormData) {
  return categorySchema.safeParse(formToObject(formData));
}

async function resolveUniqueSlug(storeId: string, base: string, excludeCategoryId?: string): Promise<string> {
  let slug = base || "categoria";
  for (let n = 2; await prisma.category.findFirst({ where: { storeId, slug, id: { not: excludeCategoryId } } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

/** Impede ciclo: uma categoria não pode virar pai dela mesma nem de um ancestral seu */
async function isValidParent(storeId: string, categoryId: string | null, parentId: string | null): Promise<boolean> {
  if (!parentId || !categoryId) return true;
  if (parentId === categoryId) return false;
  const all = await prisma.category.findMany({ where: { storeId }, select: { id: true, parentId: true } });
  return !categoryAncestors(all, parentId).some((c) => c.id === categoryId);
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseCategory(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, parentId, ...data } = parsed.data;

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, storeId }, select: { id: true } });
    if (!parent) return { fieldErrors: { parentId: ["Categoria pai não encontrada"] } };
  }

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.name));
  await prisma.category.create({ data: { ...data, slug, parentId, storeId } });
  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(categoryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parseCategory(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, parentId, ...data } = parsed.data;

  const existing = await prisma.category.findFirst({ where: { id: categoryId, storeId } });
  if (!existing) return { error: "Categoria não encontrada." };

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, storeId }, select: { id: true } });
    if (!parent) return { fieldErrors: { parentId: ["Categoria pai não encontrada"] } };
  }
  if (!(await isValidParent(storeId, categoryId, parentId))) {
    return { fieldErrors: { parentId: ["Uma categoria não pode ser pai dela mesma nem de uma subcategoria sua"] } };
  }

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.name), categoryId);
  await prisma.category.updateMany({ where: { id: categoryId, storeId }, data: { ...data, slug, parentId } });
  revalidatePath("/categories");
  revalidatePath(`/categories/${categoryId}`);
  return { success: "Categoria atualizada." };
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { storeId } = await requireSession();
  // Subcategorias ficam órfãs (parentId -> null) por causa do onDelete: SetNull; produtos mantêm as outras categorias
  await prisma.category.deleteMany({ where: { id: categoryId, storeId } });
  revalidatePath("/categories");
  redirect("/categories");
}
