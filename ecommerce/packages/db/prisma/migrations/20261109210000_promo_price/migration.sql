-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compareAtPriceInCents" INTEGER,
ADD COLUMN     "promoEndsAt" TIMESTAMP(3),
ADD COLUMN     "promoStartsAt" TIMESTAMP(3);
