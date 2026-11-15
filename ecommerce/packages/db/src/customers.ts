import { Prisma } from "@prisma/client";
import { prisma } from "./client";

/** F6.11 (LGPD): tudo que a loja guarda sobre o cliente — usado pelo lojista (admin) e pelo próprio titular (vitrine). */
export function exportCustomerData(customerId: string, storeId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, storeId },
    include: { addresses: true, orders: { include: { items: true } }, reviews: true },
  });
}

/**
 * F6.11 (LGPD): anonimiza o cliente — nome/e-mail/telefone/documento e endereços viram placeholders
 * (o e-mail precisa continuar único por loja, por isso usa o próprio id). Os pedidos NÃO são apagados
 * (obrigação fiscal): só os dados que identificam a pessoa neles são trocados; totais e itens ficam.
 * Devolve false se o cliente não é da loja ou já foi anonimizado.
 */
export async function anonymizeCustomerData(customerId: string, storeId: string): Promise<boolean> {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, storeId } });
  if (!customer || customer.anonymizedAt) return false;

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
  return true;
}
