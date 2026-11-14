import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, requireEnv } from "@/lib/stripe";
import { notifyOrderReceived, markOrderPaid, setOrderStatus } from "@/lib/orders";
import { captureError } from "@/lib/error-reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = headers().get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  // Corpo cru (texto) é obrigatório para validar a assinatura
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("[webhook] assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Pix/boleto: a sessão "completa" mas o pagamento ainda está pendente (confirma depois,
        // via checkout.session.async_payment_succeeded/failed) — avisa o cliente nesse meio-tempo.
        if (session.payment_status === "paid") await markOrderPaid(session);
        else await notifyOrderReceived(session);
        break;
      }
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
    const session = event.data.object as Stripe.Checkout.Session;
    captureError(err, { source: "webhooks/stripe", eventType: event.type, storeId: session.metadata?.storeId });
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
