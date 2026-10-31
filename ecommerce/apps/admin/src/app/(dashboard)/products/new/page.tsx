import Link from "next/link";
import { createProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <>
      <Link href="/products" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-products-link">← produtos</Link>
      <PageHeader title="Novo produto" />
      <ProductForm action={createProduct} submitLabel="Criar produto" />
    </>
  );
}
