"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@repo/db";
import { requireSession } from "@/lib/session";

/**
 * F6.11 (LGPD): anonimiza um cliente a pedido — nome/e-mail/telefone/documento e endereços viram
 * placeholders (o e-mail precisa continuar único por loja, por isso usa o próprio id). Os pedidos
 * NÃO são apagados (obrigação fiscal) — só os dados que identificam a pessoa nos pedidos também são
 * trocados pelos mesmos placeholders, pra não sobrar PII em lugar nenhum; totais e itens continuam
 * intactos.
 */
export async function anonymizeCustomer(customerId: string): Promise<void> {
  const { storeId } = await requireSession();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, storeId } });
  if (!customer || customer.anonymizedAt) return;

  const anonEmail = `anon-${customer.id}@anonimizado.local`;

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { name: null, email: anonEmail, phone: null, document: null, acceptsMarketing: false, anonymizedAt: new Date() },
    });
    await tx.customerAddress.deleteMany({ where: { customerId } });
    await tx.customerLoginToken.deleteMany({ where: { customerId } });
    await tx.order.updateMany({
      where: { customerId },
      data: { customerName: null, customerEmail: anonEmail, customerPhone: null, customerDocument: null, shippingAddress: Prisma.JsonNull },
    });
    await tx.review.updateMany({ where: { customerId }, data: { authorName: "Cliente anônimo" } });
    await tx.abandonedCart.deleteMany({ where: { storeId, email: customer.email } });
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}
