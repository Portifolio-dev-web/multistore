"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { slugify } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { formToObject, pageSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

function parsePage(formData: FormData) {
  return pageSchema.safeParse({ ...formToObject(formData), published: formData.get("published") === "on" });
}

async function resolveUniqueSlug(storeId: string, base: string, excludePageId?: string): Promise<string> {
  let slug = base || "pagina";
  for (let n = 2; await prisma.page.findFirst({ where: { storeId, slug, id: { not: excludePageId } } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createPage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parsePage(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, ...data } = parsed.data;

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.title));
  await prisma.page.create({ data: { ...data, slug, storeId } });
  revalidatePath("/pages");
  redirect("/pages");
}

export async function updatePage(pageId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = parsePage(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { slug: rawSlug, ...data } = parsed.data;

  const existing = await prisma.page.findFirst({ where: { id: pageId, storeId } });
  if (!existing) return { error: "Página não encontrada." };

  const slug = await resolveUniqueSlug(storeId, slugify(rawSlug || data.title), pageId);
  await prisma.page.updateMany({ where: { id: pageId, storeId }, data: { ...data, slug } });
  revalidatePath("/pages");
  revalidatePath(`/pages/${pageId}`);
  return { success: "Página atualizada." };
}

export async function deletePage(pageId: string): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.page.deleteMany({ where: { id: pageId, storeId } });
  revalidatePath("/pages");
  redirect("/pages");
}
