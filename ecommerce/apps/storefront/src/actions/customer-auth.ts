"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@repo/db";
import { sendCustomerLoginLink } from "@repo/mail";
import { storeUrl } from "@repo/db/urls";
import { getStoreBase, storeHref } from "@/lib/paths";
import { deleteCustomerSession } from "@/lib/customer-session";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido.");

export type MagicLinkState = { sent?: boolean; error?: string };

/** Sempre responde "enviamos o link" (não revela se o e-mail já tinha conta) — cria a conta na hora se for a primeira vez. */
export async function requestMagicLink(storeSlug: string, _prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  const email = parsed.data;

  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return { error: "Loja não encontrada." };

  const customer = await prisma.customer.upsert({
    where: { storeId_email: { storeId: store.id, email } },
    update: {},
    create: { storeId: store.id, email },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.customerLoginToken.create({
    data: { customerId: customer.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const loginUrl = `${storeUrl(store)}/conta/entrar/confirmar?token=${rawToken}`;
  await sendCustomerLoginLink(store, email, loginUrl);

  return { sent: true };
}

export async function logoutCustomer(storeSlug: string): Promise<void> {
  deleteCustomerSession();
  redirect(storeHref(getStoreBase(storeSlug), "/conta/entrar"));
}
