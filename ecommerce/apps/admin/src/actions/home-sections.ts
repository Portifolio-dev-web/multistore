"use server";

import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { homeSectionsFormSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

export async function saveHomeSectionsDraft(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = homeSectionsFormSchema.safeParse({ sectionsJson: formData.get("sectionsJson") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.store.update({
    where: { id: storeId },
    data: { homeSectionsDraft: parsed.data.sectionsJson as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/home");
  return { success: "Rascunho salvo." };
}

export async function publishHomeSections(): Promise<void> {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { homeSections: true, homeSectionsDraft: true } });
  if (!store) return;
  await prisma.store.update({
    where: { id: storeId },
    data: { homeSections: (store.homeSectionsDraft ?? store.homeSections) as Prisma.InputJsonValue },
  });
  revalidatePath("/home");
  revalidatePath("/", "layout");
}

export async function discardHomeSectionsDraft(): Promise<void> {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { homeSections: true } });
  if (!store) return;
  await prisma.store.update({ where: { id: storeId }, data: { homeSectionsDraft: store.homeSections as Prisma.InputJsonValue } });
  revalidatePath("/home");
}
