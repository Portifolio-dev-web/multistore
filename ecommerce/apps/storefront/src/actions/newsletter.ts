"use server";

import { z } from "zod";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido.");

export type NewsletterState = { success?: boolean; error?: string };

// Reaproveita Customer.acceptsMarketing (F3.1) em vez de um model de newsletter novo.
export async function subscribeNewsletter(storeSlug: string, _prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "E-mail inválido." };

  const store = await getStoreBySlug(storeSlug);
  if (!store) return { error: "Loja não encontrada." };

  await prisma.customer.upsert({
    where: { storeId_email: { storeId: store.id, email: parsed.data } },
    update: { acceptsMarketing: true },
    create: { storeId: store.id, email: parsed.data, acceptsMarketing: true },
  });

  return { success: true };
}
