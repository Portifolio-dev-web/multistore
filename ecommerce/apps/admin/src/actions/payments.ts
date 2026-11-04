"use server";

import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { getStripe, requireEnv } from "@/lib/stripe";

/** Cria (se preciso) a conta Express da loja e manda o lojista pro onboarding hospedado pelo Stripe */
export async function connectStripeAccount(): Promise<void> {
  const { storeId, email } = await requireSession();
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  let accountId = store.stripeAccountId;
  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: "BR",
      email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    // Alguém pode já ter clicado duas vezes rápido: só grava se continuar sem conta
    await prisma.store.updateMany({ where: { id: storeId, stripeAccountId: null }, data: { stripeAccountId: accountId } });
  }

  const adminUrl = requireEnv("ADMIN_URL");
  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${adminUrl}/payments`,
    return_url: `${adminUrl}/payments`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
