-- Lote 3 do DEPLOY_REPORT: rate limit genérico (C3) e índices dos crons/limpeza (I2/I3).
-- Escrita à mão: o diff do Prisma também tentava dropar os índices pg_trgm (criados por SQL cru
-- em 20261113100000_search_indexes) e reescrever defaults gen_random_uuid() — nada disso é desejado.

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");
CREATE INDEX "RateLimitHit_createdAt_idx" ON "RateLimitHit"("createdAt");
CREATE INDEX "AbandonedCart_createdAt_idx" ON "AbandonedCart"("createdAt");
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");
CREATE INDEX "Order_fulfillmentStatus_deliveredAt_idx" ON "Order"("fulfillmentStatus", "deliveredAt");
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");
