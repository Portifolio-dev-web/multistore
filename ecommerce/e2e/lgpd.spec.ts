// LGPD: anonimizar apaga PII do cliente e dos pedidos dele, mas mantém o pedido (obrigação fiscal).
import { expect, test } from "@playwright/test";
import { anonymizeCustomerData, exportCustomerData, prisma } from "@repo/db";
import { STORE_SLUG } from "./env";

test.describe("LGPD", () => {
  test("exporta e anonimiza só na loja certa, mantendo o pedido", async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
    const email = `titular-${Date.now()}@teste.com`;
    const customer = await prisma.customer.create({
      data: { storeId: store.id, email, name: "Maria Titular", phone: "11999990000", document: "12345678909" },
    });
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        number: 900_000 + Math.floor(Math.random() * 99_999),
        customerId: customer.id,
        customerEmail: email,
        customerName: "Maria Titular",
        totalInCents: 1000,
      },
    });

    expect((await exportCustomerData(customer.id, store.id))?.orders).toHaveLength(1);
    expect(await exportCustomerData(customer.id, "outra-loja")).toBeNull();
    expect(await anonymizeCustomerData(customer.id, "outra-loja")).toBe(false);

    expect(await anonymizeCustomerData(customer.id, store.id)).toBe(true);
    expect(await anonymizeCustomerData(customer.id, store.id)).toBe(false); // idempotente

    const after = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(after).toMatchObject({ name: null, phone: null, document: null, email: `anon-${customer.id}@anonimizado.local` });
    const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(orderAfter).toMatchObject({ customerName: null, customerEmail: `anon-${customer.id}@anonimizado.local`, totalInCents: 1000 });
  });
});
