-- AlterTable
ALTER TABLE "Product" ADD COLUMN "imageAlts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
