-- AlterTable: trava de idempotencia pra devolver estoque uma unica vez por pedido
ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3);
