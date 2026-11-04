import type { Prisma } from "@prisma/client";

/**
 * Reserva o próximo número de pedido da loja de forma atômica: o `UPDATE` trava a linha
 * da loja até a transação terminar, então dois checkouts concorrentes nunca saem com o
 * mesmo número (o segundo espera o lock e já lê o contador já incrementado pelo primeiro).
 */
export async function nextOrderNumber(tx: Prisma.TransactionClient, storeId: string): Promise<number> {
  const store = await tx.store.update({
    where: { id: storeId },
    data: { nextOrderNumber: { increment: 1 } },
    select: { nextOrderNumber: true },
  });
  return store.nextOrderNumber - 1;
}
