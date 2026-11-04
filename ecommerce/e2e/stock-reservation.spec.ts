// Igual ao order-number.spec.ts: só faz sentido com um Postgres de verdade (precisa do
// lock de linha da transação), por isso mora aqui e não em packages/db como teste unitário puro.
import { expect, test } from "@playwright/test";
import { nextOrderNumber, OutOfStockError, prisma, releaseStock, reserveStock } from "@repo/db";
import { STORE_SLUG } from "./env";

async function createPendingOrder(storeId: string, productId: string, priceInCents: number) {
  return prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, storeId);
    await reserveStock(tx, [{ productId, quantity: 1 }]);
    return tx.order.create({
      data: {
        storeId,
        number,
        totalInCents: priceInCents,
        items: {
          create: [{ productId, productName: "teste-reserva", unitPriceInCents: priceInCents, quantity: 1 }],
        },
      },
    });
  });
}

test.describe("reserva de estoque", () => {
  test("duas reservas concorrentes pela última unidade: só uma passa", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const product = await prisma.product.create({
      data: { storeId: store.id, name: "Produto com 1 unidade", priceInCents: 1000, stock: 1 },
    });

    const reserve = () => prisma.$transaction((tx) => reserveStock(tx, [{ productId: product.id, quantity: 1 }]));

    const results = await Promise.allSettled([reserve(), reserve()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(OutOfStockError);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.stock).toBe(0);
  });

  test("liberar o estoque de um pedido é idempotente mesmo chamado mais de uma vez", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const product = await prisma.product.create({
      data: { storeId: store.id, name: "Produto pra liberar", priceInCents: 2000, stock: 5 },
    });

    const order = await createPendingOrder(store.id, product.id, product.priceInCents);
    const afterReserve = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterReserve.stock).toBe(4);

    await Promise.all([
      prisma.$transaction((tx) => releaseStock(tx, order.id)),
      prisma.$transaction((tx) => releaseStock(tx, order.id)),
    ]);

    const afterRelease = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterRelease.stock).toBe(5);
  });
});
