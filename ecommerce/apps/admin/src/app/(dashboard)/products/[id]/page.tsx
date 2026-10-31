import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { deleteProduct, updateProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const product = await prisma.product.findFirst({ where: { id: params.id, storeId } });
  if (!product) notFound();

  return (
    <>
      <Link href="/products" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-products-link">← produtos</Link>
      <PageHeader
        title={product.name}
        subtitle="Editar produto"
        action={<DeleteButton action={deleteProduct.bind(null, product.id)} />}
      />
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} submitLabel="Salvar alterações" />
    </>
  );
}
