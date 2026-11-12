import type { Prisma } from "@prisma/client";

export class OutOfStockError extends Error {
  constructor(public readonly variantId: string) {
    super(`Estoque insuficiente para a variante ${variantId}.`);
  }
}

export type StockLine = { variantId: string; quantity: number };

/**
 * Baixa o estoque de cada linha atomicamente (`UPDATE ... WHERE stock >= qty`). Se alguma
 * linha não atualizar (estoque insuficiente), lança `OutOfStockError` — o rollback da
 * transação desfaz as baixas já feitas nas linhas anteriores.
 */
export async function reserveStock(tx: Prisma.TransactionClient, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: line.variantId, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (count === 0) throw new OutOfStockError(line.variantId);
  }
}

/**
 * Devolve o estoque reservado por um pedido, uma única vez (trava em `stockReleasedAt`).
 * Chamadas repetidas (reenvio de webhook, etc.) não devolvem a mesma quantidade de novo.
 */
export async function releaseStock(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const { count } = await tx.order.updateMany({
    where: { id: orderId, stockReleasedAt: null },
    data: { stockReleasedAt: new Date() },
  });
  if (count === 0) return;

  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } } });
  for (const item of items) {
    await tx.productVariant.update({ where: { id: item.variantId! }, data: { stock: { increment: item.quantity } } });
  }
}
