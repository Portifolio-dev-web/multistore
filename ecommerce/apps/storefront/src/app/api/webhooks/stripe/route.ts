import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeProvider } from "@/lib/payments/stripe";
import { markOrderPaid, setOrderStatus } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    event = await stripeProvider.parseWebhook(req);
  } catch (err) {
    console.error("[webhook] assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await markOrderPaid(event.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await setOrderStatus(event.data.object, "FAILED");
        break;
      case "checkout.session.expired":
        await setOrderStatus(event.data.object, "EXPIRED");
        break;
    }
  } catch (err) {
    console.error(`[webhook] erro ao processar ${event.type}`, err);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
