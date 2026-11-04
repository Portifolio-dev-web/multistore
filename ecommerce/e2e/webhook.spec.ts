// Reaproveita a mesma lógica do scripts/test-webhook.mjs: cria um pedido PENDING direto no
// banco (sem passar pelo Stripe real) e envia o evento assinado pro endpoint do storefront.
import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { nextOrderNumber, prisma, reserveStock } from "@repo/db";
import { STORE_SLUG, STRIPE_WEBHOOK_SECRET } from "./env";

test.describe("webhook do Stripe", () => {
  test("marca o pedido como pago e é idempotente a reenvios (estoque já reservado na criação)", async ({
    request,
  }) => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const product = await prisma.product.findFirstOrThrow({
      where: { storeId: store.id, stock: { gt: 1 } },
    });
    const stockBefore = product.stock;

    const order = await prisma.$transaction(async (tx) => {
      const number = await nextOrderNumber(tx, store.id);
      await reserveStock(tx, [{ productId: product.id, quantity: 1 }]);
      return tx.order.create({
        data: {
          storeId: store.id,
          number,
          totalInCents: product.priceInCents,
          items: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                unitPriceInCents: product.priceInCents,
                quantity: 1,
              },
            ],
          },
        },
      });
    });

    const stripe = new Stripe("sk_test_dummy");
    const payload = JSON.stringify({
      id: "evt_e2e",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_e2e_${order.id}`,
          object: "checkout.session",
          payment_status: "paid",
          payment_intent: "pi_e2e_123",
          metadata: { orderId: order.id },
          customer_details: { email: "cliente@teste.com", name: "Cliente Teste" },
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_SECRET });
    const headers = { "content-type": "application/json", "stripe-signature": signature };

    const first = await request.post("/api/webhooks/stripe", { data: payload, headers });
    expect(first.ok()).toBe(true);

    // reenvio simula retry do Stripe: precisa continuar idempotente
    const second = await request.post("/api/webhooks/stripe", { data: payload, headers });
    expect(second.ok()).toBe(true);

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(updatedOrder.status).toBe("PAID");
    expect(updatedOrder.customerEmail).toBe("cliente@teste.com");
    expect(updatedProduct.stock).toBe(stockBefore - 1);
  });
});
