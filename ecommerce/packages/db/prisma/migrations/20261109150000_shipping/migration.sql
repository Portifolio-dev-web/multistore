-- CreateEnum
CREATE TYPE "ShippingRateType" AS ENUM ('STATE', 'ZIP_RANGE');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "freeShippingMinInCents" INTEGER,
ADD COLUMN     "motoboyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motoboyMaxDistanceKm" INTEGER,
ADD COLUMN     "motoboyMinPriceInCents" INTEGER,
ADD COLUMN     "motoboyPricePerKmInCents" INTEGER,
ADD COLUMN     "originZip" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "lengthCm" INTEGER,
ADD COLUMN     "weightGrams" INTEGER,
ADD COLUMN     "widthCm" INTEGER;

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "ShippingRateType" NOT NULL,
    "label" TEXT NOT NULL,
    "state" TEXT,
    "zipFrom" TEXT,
    "zipTo" TEXT,
    "priceInCents" INTEGER NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingRate_storeId_idx" ON "ShippingRate"("storeId");

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
