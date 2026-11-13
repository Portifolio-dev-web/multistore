-- F2.5: indices trigram pra acelerar busca por trecho (ILIKE "%termo%") em catalogos grandes.
-- Sem equivalente direto na sintaxe de @@index do schema.prisma (precisaria da preview feature
-- extendedIndexes), por isso só existe aqui na migration.
-- Qualifica o schema (public) explicitamente: o e2e roda as migrations num schema isolado
-- (search_path != public) e sem isso "gin_trgm_ops" não é resolvido lá.
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;

CREATE INDEX "Product_name_trgm_idx" ON "Product" USING gin ("name" public.gin_trgm_ops);
CREATE INDEX "ProductVariant_sku_trgm_idx" ON "ProductVariant" USING gin ("sku" public.gin_trgm_ops);
CREATE INDEX "Order_customerEmail_trgm_idx" ON "Order" USING gin ("customerEmail" public.gin_trgm_ops);
CREATE INDEX "Order_customerName_trgm_idx" ON "Order" USING gin ("customerName" public.gin_trgm_ops);
CREATE INDEX "Order_customerDocument_trgm_idx" ON "Order" USING gin ("customerDocument" public.gin_trgm_ops);
