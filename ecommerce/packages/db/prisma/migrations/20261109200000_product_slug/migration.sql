-- AlterTable: slug entra opcional pra poder fazer o backfill antes de travar NOT NULL
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

-- Backfill: slugifica o nome dos produtos existentes, numerando em caso de colisao por loja
WITH base AS (
  SELECT "id", "storeId",
    trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))) AS "baseSlug"
  FROM "Product"
),
numbered AS (
  SELECT "id",
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY "storeId", "baseSlug" ORDER BY "id") = 1
         THEN "baseSlug"
         ELSE "baseSlug" || '-' || ROW_NUMBER() OVER (PARTITION BY "storeId", "baseSlug" ORDER BY "id")
    END AS "slug"
  FROM base
)
UPDATE "Product" p SET "slug" = numbered."slug"
FROM numbered
WHERE p."id" = numbered."id";

-- AlterTable: agora que todo produto tem slug, trava NOT NULL
ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "SlugRedirect" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "fromSlug" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_storeId_fromSlug_key" ON "SlugRedirect"("storeId", "fromSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");

-- AddForeignKey
ALTER TABLE "SlugRedirect" ADD CONSTRAINT "SlugRedirect_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlugRedirect" ADD CONSTRAINT "SlugRedirect_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
