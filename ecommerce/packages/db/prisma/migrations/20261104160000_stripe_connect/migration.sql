-- AlterTable: Stripe Connect por loja (F1.4) - sem segredo pra criptografar aqui,
-- a conta Express nao tem token proprio, as chamadas usam o STRIPE_SECRET_KEY da plataforma
ALTER TABLE "Store" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Store" ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Store" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Store_stripeAccountId_key" ON "Store"("stripeAccountId");
