"use server";

import { z } from "zod";
import { nextOrderNumber, OutOfStockError, prisma, releaseStock, reserveStock, type Prisma } from "@repo/db";
import { calculateOrderPricing } from "@repo/db/pricing";
import { storeUrl } from "@repo/db/urls";
import { getStripe } from "@/lib/stripe";
import { customerDetailsSchema } from "@/lib/validation";

const checkoutSchema = z
  .object({
    storeSlug: z.string().min(1),
    items: z
      .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
      .min(1, "Carrinho vazio")
      .max(50),
  })
  .merge(customerDetailsSchema);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResult = { url: string } | { error: string };

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos. Confira as informações e tente de novo." };
  const {
    storeSlug,
    items,
    email,
    name,
    phone,
    document,
    zip,
    street,
    number: addressNumber,
    complement,
    district,
    city,
    state,
  } = parsed.data;

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

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx, store.id);
      await reserveStock(
        tx,
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      );
      const shippingAddress: Prisma.InputJsonValue = {
        name,
        zip,
        street,
        number: addressNumber,
        complement,
        district,
        city,
        state,
      };
      return tx.order.create({
        data: {
          storeId: store.id,
          number: orderNumber,
          totalInCents,
          currency: store.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone,
          customerDocument: document,
          shippingAddress,
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
  } catch (err) {
    if (err instanceof OutOfStockError) {
      const product = byId.get(err.productId);
      return { error: `Estoque insuficiente para "${product?.name ?? "um dos produtos"}".` };
    }
    throw err;
  }

  const baseUrl = storeUrl(store);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { orderId: order.id, storeId: store.id },
      customer_email: email,
      // Reserva de estoque é curta: a sessão expira (e devolve o estoque) em 30 minutos
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
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
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      await releaseStock(tx, order.id);
    });
    return { error: "Falha ao conectar com o Stripe. Tente novamente." };
  }
}
