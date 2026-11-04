-- AlterTable: telefone e CPF/CNPJ coletados no checkout proprio (F1.3)
ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerDocument" TEXT;
