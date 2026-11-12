-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT,
    "combination" JSONB NOT NULL DEFAULT '{}',
    "priceInCents" INTEGER,
    "compareAtPriceInCents" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "weightInGrams" INTEGER,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: uma variante padrao por produto existente, levando o preco e o estoque atuais
INSERT INTO "ProductVariant" ("id", "productId", "combination", "priceInCents", "compareAtPriceInCents", "stock", "updatedAt")
SELECT gen_random_uuid()::text, "id", '{}', "priceInCents", "compareAtPriceInCents", "stock", CURRENT_TIMESTAMP
FROM "Product";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variantId" TEXT,
ADD COLUMN     "variantLabel" TEXT;

-- Backfill: liga cada OrderItem existente a variante padrao do produto que ele referencia
UPDATE "OrderItem" oi
SET "variantId" = pv."id"
FROM "ProductVariant" pv
WHERE pv."productId" = oi."productId" AND oi."variantId" IS NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
