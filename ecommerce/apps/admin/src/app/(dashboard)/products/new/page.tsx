import Link from "next/link";
import { prisma } from "@repo/db";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { createProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  const { storeId } = await requireSession();
  const categoryRows = await prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });
  const categories = categoryRows.map((c) => ({
    id: c.id,
    label: "— ".repeat(categoryAncestors(categoryRows, c.id).length - 1) + c.name,
  }));

  return (
    <>
      <Link href="/products" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-products-link">← produtos</Link>
      <PageHeader title="Novo produto" />
      <ProductForm action={createProduct} categories={categories} submitLabel="Criar produto" />
    </>
  );
}
