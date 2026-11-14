"use server";

import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

const PRICE_BY_PLAN: Record<"ESSENCIAL" | "PRO", string | undefined> = {
  ESSENCIAL: process.env.STRIPE_PRICE_ESSENCIAL,
  PRO: process.env.STRIPE_PRICE_PRO,
};

function adminUrl(path: string): string {
  return `${process.env.ADMIN_URL ?? "http://localhost:3001"}${path}`;
}

/** Cria (se preciso) o Customer no Stripe e abre o Checkout em modo assinatura, com 14 dias de teste */
export async function createBillingCheckout(plan: "ESSENCIAL" | "PRO"): Promise<{ url: string } | { error: string }> {
  const { storeId, email } = await requireSession("billing");
  const priceId = PRICE_BY_PLAN[plan];
  if (!priceId) return { error: `Plano ${plan} não configurado (defina STRIPE_PRICE_${plan} no .env).` };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "Loja não encontrada." };

  const stripe = getStripe();
  let customerId = store.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, name: store.name, metadata: { storeId } });
    customerId = customer.id;
    await prisma.store.update({ where: { id: storeId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { storeId, plan } },
    metadata: { storeId, plan },
    success_url: adminUrl("/billing?success=1"),
    cancel_url: adminUrl("/billing"),
  });
  if (!session.url) return { error: "Não foi possível abrir o checkout." };
  return { url: session.url };
}

/** Portal hospedado do Stripe: trocar cartão, ver faturas, cancelar a assinatura */
export async function createBillingPortal(): Promise<{ url: string } | { error: string }> {
  const { storeId } = await requireSession("billing");
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { stripeCustomerId: true } });
  if (!store?.stripeCustomerId) return { error: "Nenhuma assinatura ativa ainda." };

  const session = await getStripe().billingPortal.sessions.create({ customer: store.stripeCustomerId, return_url: adminUrl("/billing") });
  return { url: session.url };
}
