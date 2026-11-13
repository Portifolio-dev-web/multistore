"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { formToObject, legalSettingsSchema, maintenanceSchema, storeSettingsSchema } from "@/lib/validation";
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

export async function updateLegalSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = legalSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.store.update({
    where: { id: storeId },
    data: { ...parsed.data, legalAddress: parsed.data.legalAddress ?? Prisma.JsonNull },
  });
  revalidatePath("/settings");
  return { success: "Dados legais salvos." };
}

export async function updateMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = maintenanceSchema.safeParse({
    maintenanceMode: formData.get("maintenanceMode") === "on",
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.maintenanceMode) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { maintenancePasswordHash: true } });
    if (!parsed.data.password && !store?.maintenancePasswordHash) {
      return { fieldErrors: { password: ["Defina uma senha para ativar o modo loja em construção"] } };
    }
  }

  await prisma.store.update({
    where: { id: storeId },
    data: {
      maintenanceMode: parsed.data.maintenanceMode,
      ...(parsed.data.password ? { maintenancePasswordHash: await bcrypt.hash(parsed.data.password, 12) } : {}),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: "Modo loja em construção atualizado." };
}
