"use server";

import { z } from "zod";
import { prisma } from "@repo/db";
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

  const lines = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return { error: "Um dos produtos não está mais disponível." };
    if (product.stock < item.quantity) return { error: `Estoque insuficiente para "${product.name}".` };
    lines.push({ product, quantity: item.quantity });
  }

  const totalInCents = lines.reduce((sum, l) => sum + l.product.priceInCents * l.quantity, 0);

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
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
