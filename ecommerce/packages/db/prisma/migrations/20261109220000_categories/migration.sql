-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Category_storeId_parentId_idx" ON "Category"("storeId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_slug_key" ON "Category"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cria uma Category raiz por valor distinto de Product.category (texto) de cada loja
WITH distinct_categories AS (
  SELECT DISTINCT "storeId", "category" AS name
  FROM "Product"
  WHERE "category" IS NOT NULL AND "category" <> ''
),
numbered AS (
  SELECT "storeId", name,
    trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) AS "baseSlug",
    ROW_NUMBER() OVER (PARTITION BY "storeId", trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) ORDER BY name) AS rn
  FROM distinct_categories
)
INSERT INTO "Category" ("id", "storeId", "name", "slug", "updatedAt")
SELECT gen_random_uuid()::text, "storeId", name,
  CASE WHEN rn = 1 THEN "baseSlug" ELSE "baseSlug" || '-' || rn END,
  CURRENT_TIMESTAMP
FROM numbered;

-- Backfill: liga cada produto a Category criada a partir do seu texto antigo
INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT c."id", p."id"
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId" AND c."name" = p."category"
WHERE p."category" IS NOT NULL AND p."category" <> '';

-- DropIndex
DROP INDEX "Product_storeId_category_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category";
