// Só faz sentido com um Postgres de verdade (precisa do lock de linha da transação),
// por isso mora aqui e não em packages/db como teste unitário puro.
import { expect, test } from "@playwright/test";
import { nextOrderNumber, prisma } from "@repo/db";
import { STORE_SLUG } from "./env";

test.describe("número de pedido", () => {
  test("duas reservas concorrentes na mesma loja nunca saem com o mesmo número", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });

    const reserve = () => prisma.$transaction((tx) => nextOrderNumber(tx, store.id));

    const [a, b, c] = await Promise.all([reserve(), reserve(), reserve()]);

    expect(new Set([a, b, c]).size).toBe(3);
  });
});
