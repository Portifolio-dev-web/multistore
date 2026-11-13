-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "gaId" TEXT,
ADD COLUMN     "gtmId" TEXT,
ADD COLUMN     "metaPixelId" TEXT,
ADD COLUMN     "tiktokPixelId" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "gtin" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "merchantNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "receivedEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "refundedAt" TIMESTAMP(3);

