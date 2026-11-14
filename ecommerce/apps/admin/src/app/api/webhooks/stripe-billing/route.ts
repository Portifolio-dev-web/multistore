import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@repo/db";
import { PLAN_LABEL, type PlanKey } from "@repo/db/plans";
import { sendPlanPastDue } from "@repo/mail";
import { getStripe, requireEnv } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_BY_PRICE: Record<string, PlanKey> = {
  ...(process.env.STRIPE_PRICE_ESSENCIAL ? { [process.env.STRIPE_PRICE_ESSENCIAL]: "ESSENCIAL" } : {}),
  ...(process.env.STRIPE_PRICE_PRO ? { [process.env.STRIPE_PRICE_PRO]: "PRO" } : {}),
};

function planFromSubscription(subscription: Stripe.Subscription): PlanKey {
  const priceId = subscription.items.data[0]?.price.id;
  return (priceId && PLAN_BY_PRICE[priceId]) || "FREE";
}

const STATUS_MAP: Record<Stripe.Subscription.Status, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED"> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "PAST_DUE",
  incomplete_expired: "CANCELED",
  paused: "PAST_DUE",
};

async function syncSubscription(subscription: Stripe.Subscription) {
  const storeId = subscription.metadata.storeId;
  const store = storeId
    ? await prisma.store.findUnique({ where: { id: storeId } })
    : await prisma.store.findFirst({ where: { stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id } });
  if (!store) return;

  const planStatus = STATUS_MAP[subscription.status];
  const plan = planStatus === "CANCELED" ? "FREE" : planFromSubscription(subscription);

  await prisma.store.update({
    where: { id: store.id },
    data: { plan, planStatus, stripeSubscriptionId: subscription.status === "canceled" ? null : subscription.id },
  });

  if (planStatus === "PAST_DUE" && store.stripeCustomerId) {
    const billingUrl = `${process.env.ADMIN_URL ?? "http://localhost:3001"}/billing`;
    const owner = await prisma.membership.findFirst({ where: { storeId: store.id, role: "OWNER" }, include: { user: true }, orderBy: { createdAt: "asc" } });
    if (owner) await sendPlanPastDue(store, owner.user.email, PLAN_LABEL[plan], billingUrl);
  }
}

export async function POST(req: Request) {
  const signature = headers().get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, requireEnv("STRIPE_BILLING_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("[webhook-billing] assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error(`[webhook-billing] erro ao processar ${event.type}`, err);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
