-- AlterTable: nextOrderNumber comeca em 1001; lojas sem pedido ficam nesse valor
ALTER TABLE "Store" ADD COLUMN "nextOrderNumber" INTEGER NOT NULL DEFAULT 1001;

-- AlterTable: "number" entra opcional pra poder fazer o backfill antes de travar NOT NULL
ALTER TABLE "Order" ADD COLUMN "number" INTEGER;

-- Backfill: numera os pedidos existentes por loja, na ordem de criacao, a partir de 1001
WITH numbered AS (
  SELECT "id", 1000 + ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "createdAt") AS "num"
  FROM "Order"
)
UPDATE "Order" o SET "number" = numbered."num"
FROM numbered
WHERE o."id" = numbered."id";

-- AlterTable: agora que todo pedido tem numero, trava NOT NULL
ALTER TABLE "Order" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_number_key" ON "Order"("storeId", "number");

-- Avanca o contador de cada loja que ja tem pedido pra depois do maior numero usado
UPDATE "Store" s SET "nextOrderNumber" = sub."maxNumber" + 1
FROM (SELECT "storeId", MAX("number") AS "maxNumber" FROM "Order" GROUP BY "storeId") sub
WHERE s."id" = sub."storeId";
