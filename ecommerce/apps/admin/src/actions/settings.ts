"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@repo/db";
import { planAllowsCustomDomain } from "@repo/db/plans";
import { requireSession } from "@/lib/session";
import { verifyDomainTxt } from "@/lib/dns";
import { addDomainToHostingProject, removeDomainFromHostingProject } from "@/lib/hosting";
import { formToObject, legalSettingsSchema, maintenanceSchema, storeSettingsSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

const DOMAIN_CLAIM_TTL_MS = 48 * 60 * 60 * 1000;

export async function updateStoreSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession("settings");
  const parsed = storeSettingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const slugOwner = await prisma.store.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== storeId) return { fieldErrors: { slug: ["Endereço já em uso por outra loja"] } };

  const current = await prisma.store.findUnique({ where: { id: storeId }, select: { customDomain: true, plan: true } });
  if (!current) return { error: "Loja não encontrada." };

  const { customDomain } = parsed.data;
  const domainData: Prisma.StoreUpdateInput = {};

  if (customDomain && customDomain !== current.customDomain) {
    if (!planAllowsCustomDomain(current.plan)) {
      return { fieldErrors: { customDomain: ["Domínio próprio é um recurso dos planos Essencial e Pro"] } };
    }
    const root = process.env.STOREFRONT_ROOT_DOMAIN?.split(":")[0];
    if (root && (customDomain === root || customDomain.endsWith(`.${root}`))) {
      return { fieldErrors: { customDomain: ["Use um domínio seu, não o domínio da plataforma"] } };
    }

    // F6.5: domínio já reivindicado por outra loja — só libera se a reivindicação dela nunca foi
    // verificada e já passou do prazo (evita que alguém "tome" um domínio verificado de outra loja)
    const domainOwner = await prisma.store.findUnique({
      where: { customDomain },
      select: { id: true, domainStatus: true, domainClaimedAt: true },
    });
    if (domainOwner && domainOwner.id !== storeId) {
      const expired = domainOwner.domainStatus === "PENDING" && (!domainOwner.domainClaimedAt || Date.now() - domainOwner.domainClaimedAt.getTime() > DOMAIN_CLAIM_TTL_MS);
      if (!expired) return { fieldErrors: { customDomain: ["Domínio já conectado a outra loja"] } };
      await prisma.store.update({ where: { id: domainOwner.id }, data: { customDomain: null, domainStatus: null, domainVerificationToken: null, domainClaimedAt: null } });
    }

    domainData.domainStatus = "PENDING";
    domainData.domainVerificationToken = crypto.randomBytes(16).toString("hex");
    domainData.domainClaimedAt = new Date();
  } else if (!customDomain && current.customDomain) {
    domainData.domainStatus = null;
    domainData.domainVerificationToken = null;
    domainData.domainClaimedAt = null;
    await removeDomainFromHostingProject(current.customDomain);
  }

  await prisma.store.update({ where: { id: storeId }, data: { ...parsed.data, ...domainData } });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { success: customDomain && customDomain !== current.customDomain ? "Configurações salvas. Verifique o domínio para ativá-lo." : "Configurações salvas." };
}

/** F6.5: checa o TXT e, se confirmado, pede à hospedagem pra adicionar o domínio (SSL automático) */
export async function verifyDomain(_prev: FormState): Promise<FormState> {
  const { storeId } = await requireSession("settings");
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { customDomain: true, domainVerificationToken: true, domainStatus: true },
  });
  if (!store?.customDomain || !store.domainVerificationToken) return { error: "Nenhum domínio pendente de verificação." };
  if (store.domainStatus === "VERIFIED") return { success: "Domínio já verificado." };

  const ok = await verifyDomainTxt(store.customDomain, store.domainVerificationToken);
  if (!ok) {
    return { error: `Registro TXT não encontrado em "_multistore.${store.customDomain}". A propagação de DNS pode levar algumas horas.` };
  }

  await prisma.store.update({ where: { id: storeId }, data: { domainStatus: "VERIFIED" } });
  await addDomainToHostingProject(store.customDomain);
  revalidatePath("/settings");
  return { success: "Domínio verificado! A vitrine já responde por ele." };
}

export async function updateLegalSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession("settings");
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
  const { storeId } = await requireSession("settings");
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
