import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { deleteProduct, updateProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: params.id, storeId },
    include: { categories: true, variants: { orderBy: { position: "asc" } } },
  });
  if (!product) notFound();

  const categoryRows = await prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });
  const categories = categoryRows.map((c) => ({
    id: c.id,
    label: "— ".repeat(categoryAncestors(categoryRows, c.id).length - 1) + c.name,
  }));

  return (
    <>
      <Link href="/products" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-products-link">← produtos</Link>
      <PageHeader
        title={product.name}
        subtitle="Editar produto"
        action={
          <div className="flex gap-2">
            <Link href={`/products/${product.id}/variants`} className="btn-outline" data-testid="manage-variants-link">
              Variações ({product.variants.length})
            </Link>
            <DeleteButton action={deleteProduct.bind(null, product.id)} />
          </div>
        }
      />
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        product={{ ...product, categoryIds: product.categories.map((c) => c.id), stock: product.variants[0]?.stock ?? 0 }}
        categories={categories}
        variantCount={product.variants.length}
        aiEnabled={!!process.env.ANTHROPIC_API_KEY}
        submitLabel="Salvar alterações"
      />
    </>
  );
}
