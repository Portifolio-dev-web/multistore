// Teste local: cria um pedido PENDING, envia checkout.session.completed assinado e confere status/estoque.
// Uso: DATABASE_URL=... STRIPE_WEBHOOK_SECRET=... WEBHOOK_URL=http://localhost:3000/api/webhooks/stripe node scripts/test-webhook.mjs
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe("sk_test_dummy");
const url = process.env.WEBHOOK_URL;

const variant = await prisma.productVariant.findFirst({ where: { stock: { gt: 1 } }, include: { product: true } });
const product = variant.product;
const order = await prisma.order.create({
  data: {
    storeId: product.storeId,
    totalInCents: product.priceInCents,
    items: { create: [{ productId: product.id, variantId: variant.id, productName: product.name, unitPriceInCents: product.priceInCents, quantity: 1 }] },
  },
});

const payload = JSON.stringify({
  id: "evt_test",
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_" + order.id,
      object: "checkout.session",
      payment_status: "paid",
      payment_intent: "pi_test_123",
      metadata: { orderId: order.id },
      customer_details: { email: "cliente@teste.com", name: "Cliente Teste" },
    },
  },
});
const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });

for (let i = 1; i <= 2; i++) {
  const res = await fetch(url, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
  console.log(`envio ${i}: HTTP ${res.status}`);
}

const updated = await prisma.order.findUnique({ where: { id: order.id } });
const after = await prisma.productVariant.findUnique({ where: { id: variant.id } });
console.log(`status=${updated.status} email=${updated.customerEmail} estoque ${variant.stock} -> ${after.stock}`);
await prisma.$disconnect();
