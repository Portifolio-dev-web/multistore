"use server";

import { z } from "zod";
import { dispatchWebhook, nextOrderNumber, OutOfStockError, prisma, releaseStock, reserveStock, type Prisma } from "@repo/db";
import {
  applyDiscounts,
  calculateOrderPricing,
  distributeDiscountProportionally,
  type CouponInput,
  type PricingVariant,
  type PromotionInput,
} from "@repo/db/pricing";
import { effectivePrice } from "@repo/db/utils";
import { storeUrl } from "@repo/db/urls";
import { getStripe } from "@/lib/stripe";
import { customerDetailsSchema } from "@/lib/validation";

const checkoutSchema = z
  .object({
    storeSlug: z.string().min(1),
    items: z
      .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
      .min(1, "Carrinho vazio")
      .max(50),
    couponCode: z.string().trim().toUpperCase().optional(),
  })
  .merge(customerDetailsSchema);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResult = { url: string } | { error: string };

/** Usada pelo checkout e pela pré-visualização do cupom no carrinho/revisão — nunca confia no cliente. */
async function loadPromotions(storeId: string): Promise<PromotionInput[]> {
  const rows = await prisma.promotion.findMany({ where: { storeId, active: true } });
  return rows.map((p) => ({
    id: p.id,
    type: p.type,
    buyQuantity: p.buyQuantity,
    payQuantity: p.payQuantity,
    minQuantity: p.minQuantity,
    percentOff: p.percentOff,
    productIds: p.productIds,
  }));
}

async function loadCoupon(storeId: string, code: string, customerId: string | null): Promise<CouponInput | { error: string }> {
  const coupon = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
  if (!coupon) return { error: "Cupom não encontrado." };
  const customerUsesCount = customerId
    ? await prisma.order.count({ where: { customerId, couponCode: code, status: { in: ["PAID"] } } })
    : 0;
  return {
    type: coupon.type,
    value: coupon.value,
    minOrderInCents: coupon.minOrderInCents,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
    maxUsesPerCustomer: coupon.maxUsesPerCustomer,
    customerUsesCount,
    active: coupon.active,
  };
}

export type DiscountPreview =
  | { subtotalInCents: number; promotionDiscountInCents: number; couponDiscountInCents: number; totalInCents: number }
  | { error: string };

/** Pré-visualização do cupom no carrinho/revisão do checkout — o valor final é sempre recalculado no envio. */
export async function previewDiscounts(
  storeSlug: string,
  items: { variantId: string; quantity: number }[],
  couponCode?: string,
): Promise<DiscountPreview> {
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return { error: "Loja não encontrada." };

  const variantRows = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) }, product: { storeId: store.id, active: true } },
    include: { product: true },
  });
  const pricingVariants: PricingVariant[] = variantRows.map((v) => ({
    id: v.id,
    productId: v.productId,
    name: v.product.name,
    variantLabel: null,
    sku: v.sku,
    priceInCents: effectivePrice(v, v.product),
    stock: v.stock,
    active: v.product.active,
  }));

  const pricing = calculateOrderPricing(pricingVariants, items);
  if ("error" in pricing) return { error: pricing.error };

  const promotions = await loadPromotions(store.id);
  let coupon: CouponInput | undefined;
  if (couponCode) {
    const result = await loadCoupon(store.id, couponCode.trim().toUpperCase(), null);
    if ("error" in result) return { error: result.error };
    coupon = result;
  }

  const discounts = applyDiscounts(pricing.lines, pricing.subtotalInCents, { promotions, coupon });
  if ("error" in discounts) return { error: discounts.error };

  return {
    subtotalInCents: pricing.subtotalInCents,
    promotionDiscountInCents: discounts.promotionDiscountInCents,
    couponDiscountInCents: discounts.couponDiscountInCents,
    totalInCents: discounts.totalInCents,
  };
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos. Confira as informações e tente de novo." };
  const {
    storeSlug,
    items,
    couponCode,
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
  const variantRows = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) }, product: { storeId: store.id, active: true } },
    include: { product: true },
  });
  const byId = new Map(variantRows.map((v) => [v.id, v]));
  const pricingVariants: PricingVariant[] = variantRows.map((v) => ({
    id: v.id,
    productId: v.productId,
    name: v.product.name,
    variantLabel: null,
    sku: v.sku,
    priceInCents: effectivePrice(v, v.product),
    stock: v.stock,
    active: v.product.active,
  }));

  const pricing = calculateOrderPricing(pricingVariants, items);
  if ("error" in pricing) return { error: pricing.error };

  const lines = pricing.lines.map((l) => ({ variant: byId.get(l.variantId)!, ...l }));

  // F3.1: cria/atualiza a conta do cliente pelo e-mail (sem exigir login para comprar)
  const customer = await prisma.customer.upsert({
    where: { storeId_email: { storeId: store.id, email } },
    update: { name, phone, document },
    create: { storeId: store.id, email, name, phone, document },
  });

  const promotions = await loadPromotions(store.id);
  let coupon: CouponInput | undefined;
  if (couponCode) {
    const result = await loadCoupon(store.id, couponCode, customer.id);
    if ("error" in result) return { error: result.error };
    coupon = result;
  }

  const discounts = applyDiscounts(pricing.lines, pricing.subtotalInCents, { promotions, coupon });
  if ("error" in discounts) return { error: discounts.error };

  const totalDiscountInCents = discounts.promotionDiscountInCents + discounts.couponDiscountInCents;
  const totalInCents = discounts.totalInCents;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx, store.id);
      await reserveStock(
        tx,
        lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
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
      const created = await tx.order.create({
        data: {
          storeId: store.id,
          number: orderNumber,
          totalInCents,
          currency: store.currency,
          customerEmail: email,
          customerName: name,
          customerPhone: phone,
          customerDocument: document,
          customerId: customer.id,
          couponCode: coupon ? couponCode : null,
          discountInCents: totalDiscountInCents,
          shippingAddress,
          items: {
            // OrderItem guarda o preço ORIGINAL (sem desconto) — o desconto aparece como linha
            // separada no pedido; o valor cobrado de verdade é o totalInCents acima.
            create: lines.map((l) => ({
              productId: l.productId,
              productName: l.name,
              variantId: l.variantId,
              variantLabel: l.variantLabel,
              sku: l.sku,
              unitPriceInCents: l.unitPriceInCents,
              quantity: l.quantity,
            })),
          },
        },
      });
      await tx.orderEvent.create({
        data: { orderId: created.id, type: "CREATED", actor: "CUSTOMER", message: "Pedido criado" },
      });
      return created;
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      const variant = byId.get(err.variantId);
      return { error: `Estoque insuficiente para "${variant?.product.name ?? "um dos produtos"}".` };
    }
    throw err;
  }

  // F6.8: falha no webhook nunca derruba o checkout
  dispatchWebhook(store.id, "order.created", { id: order.id, number: order.number, totalInCents: order.totalInCents, status: order.status }).catch(
    (err) => console.error("[webhooks]", err),
  );

  const baseUrl = storeUrl(store);
  // Stripe não aceita unit_amount negativo nem desconto por linha nativo sem um Coupon seu —
  // só pra cobrar o valor certo, distribui o desconto proporcionalmente nas linhas do Stripe
  // (o pedido salvo continua com os preços originais + discountInCents separado).
  const stripeLines = distributeDiscountProportionally(lines, totalDiscountInCents);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { orderId: order.id, storeId: store.id },
      customer_email: email,
      // Reserva de estoque é curta: a sessão expira (e devolve o estoque) em 30 minutos
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: stripeLines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: store.currency,
          unit_amount: l.unitPriceInCents,
          product_data: {
            name: lines.find((orig) => orig.variantId === l.variantId)!.name + (l.variantLabel ? ` (${l.variantLabel})` : ""),
            images: byId.get(l.variantId)!.product.images.filter((u) => u.startsWith("https://")).slice(0, 1),
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
      await tx.orderEvent.create({
        data: { orderId: order.id, type: "FAILED", actor: "SYSTEM", message: "Falha ao abrir o pagamento" },
      });
    });
    return { error: "Falha ao conectar com o Stripe. Tente novamente." };
  }
}
