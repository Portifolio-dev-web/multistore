"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { formToObject, storeSettingsSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

export async function updateStoreSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = storeSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slugOwner = await prisma.store.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== storeId) return { fieldErrors: { slug: ["Endereço já em uso por outra loja"] } };

  const { customDomain } = parsed.data;
  if (customDomain) {
    const root = process.env.STOREFRONT_ROOT_DOMAIN?.split(":")[0];
    if (root && (customDomain === root || customDomain.endsWith(`.${root}`))) {
      return { fieldErrors: { customDomain: ["Use um domínio seu, não o domínio da plataforma"] } };
    }
    const domainOwner = await prisma.store.findUnique({ where: { customDomain }, select: { id: true } });
    if (domainOwner && domainOwner.id !== storeId) return { fieldErrors: { customDomain: ["Domínio já conectado a outra loja"] } };
  }

  await prisma.store.update({ where: { id: storeId }, data: parsed.data });
  revalidatePath("/", "layout");
  return { success: "Configurações salvas." };
}
