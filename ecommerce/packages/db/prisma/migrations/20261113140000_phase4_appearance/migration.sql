-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('CLASSICO', 'MODERNO', 'MINIMALISTA');

-- CreateEnum
CREATE TYPE "Font" AS ENUM ('SANS', 'SERIF', 'MONO');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "announcementBar" TEXT,
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "font" "Font" NOT NULL DEFAULT 'SANS',
ADD COLUMN     "homeSections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "homeSectionsDraft" JSONB,
ADD COLUMN     "legalAddress" JSONB,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maintenancePasswordHash" TEXT,
ADD COLUMN     "navigation" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "socialLinks" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'CLASSICO';

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_storeId_slug_key" ON "Page"("storeId", "slug");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

