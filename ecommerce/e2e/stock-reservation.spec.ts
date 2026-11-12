// Igual ao order-number.spec.ts: só faz sentido com um Postgres de verdade (precisa do
// lock de linha da transação), por isso mora aqui e não em packages/db como teste unitário puro.
import { expect, test } from "@playwright/test";
import { nextOrderNumber, OutOfStockError, prisma, releaseStock, reserveStock } from "@repo/db";
import { STORE_SLUG } from "./env";

async function createPendingOrder(storeId: string, productId: string, variantId: string, priceInCents: number) {
  return prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, storeId);
    await reserveStock(tx, [{ variantId, quantity: 1 }]);
    return tx.order.create({
      data: {
        storeId,
        number,
        totalInCents: priceInCents,
        items: {
          create: [{ productId, variantId, productName: "teste-reserva", unitPriceInCents: priceInCents, quantity: 1 }],
        },
      },
    });
  });
}

async function createProductWithStock(storeId: string, name: string, priceInCents: number, stock: number) {
  const product = await prisma.product.create({
    data: { storeId, name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, priceInCents, variants: { create: { stock } } },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

test.describe("reserva de estoque", () => {
  test("duas reservas concorrentes pela última unidade: só uma passa", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const { variant } = await createProductWithStock(store.id, "Produto com 1 unidade", 1000, 1);

    const reserve = () => prisma.$transaction((tx) => reserveStock(tx, [{ variantId: variant.id, quantity: 1 }]));

    const results = await Promise.allSettled([reserve(), reserve()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(OutOfStockError);

    const updated = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(updated.stock).toBe(0);
  });

  test("liberar o estoque de um pedido é idempotente mesmo chamado mais de uma vez", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const { product, variant } = await createProductWithStock(store.id, "Produto pra liberar", 2000, 5);

    const order = await createPendingOrder(store.id, product.id, variant.id, product.priceInCents);
    const afterReserve = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(afterReserve.stock).toBe(4);

    await Promise.all([
      prisma.$transaction((tx) => releaseStock(tx, order.id)),
      prisma.$transaction((tx) => releaseStock(tx, order.id)),
    ]);

    const afterRelease = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(afterRelease.stock).toBe(5);
  });
});
