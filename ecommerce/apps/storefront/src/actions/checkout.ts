"use server";

import { z } from "zod";
import { nextOrderNumber, prisma } from "@repo/db";
import { calculateOrderPricing } from "@repo/db/pricing";
import { storeUrl } from "@repo/db/urls";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  storeSlug: z.string().min(1),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1, "Carrinho vazio")
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResult = { url: string } | { error: string };

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Carrinho inválido." };
  const { storeSlug, items } = parsed.data;

  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return { error: "Loja não encontrada." };

  // Preços e estoque SEMPRE vêm do banco, nunca do cliente
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, storeId: store.id, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const pricing = calculateOrderPricing(products, items);
  if ("error" in pricing) return { error: pricing.error };

  const lines = pricing.lines.map((l) => ({ product: byId.get(l.productId)!, quantity: l.quantity }));
  const totalInCents = pricing.totalInCents;

  const order = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, store.id);
    return tx.order.create({
      data: {
        storeId: store.id,
        number,
        totalInCents,
        currency: store.currency,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            unitPriceInCents: l.product.priceInCents,
            quantity: l.quantity,
          })),
        },
      },
    });
  });

  const baseUrl = storeUrl(store);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { orderId: order.id, storeId: store.id },
      shipping_address_collection: { allowed_countries: ["BR"] },
      phone_number_collection: { enabled: true },
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: store.currency,
          unit_amount: l.product.priceInCents,
          product_data: {
            name: l.product.name,
            images: l.product.images.filter((u) => u.startsWith("https://")).slice(0, 1),
          },
        },
      })),
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel?order=${order.id}`,
    });

    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    if (!session.url) return { error: "Não foi possível iniciar o pagamento." };
    return { url: session.url };
  } catch (err) {
    console.error("[checkout] Stripe error", err);
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return { error: "Falha ao conectar com o Stripe. Tente novamente." };
  }
}
