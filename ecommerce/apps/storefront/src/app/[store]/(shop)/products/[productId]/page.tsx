import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase } from "@/lib/paths";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";

type Props = { params: { store: string; productId: string } };

export default async function ProductPage({ params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: store.id, active: true } });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Link href={getStoreBase(store.slug) || "/"} className="text-sm text-ink/50 hover:text-ink" data-testid="product-back-link">← Voltar à vitrine</Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="animate-rise lg:pt-6">
          {product.category && <p className="label">{product.category}</p>}
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl" data-testid="product-name">{product.name}</h1>
          <p className="mt-5 font-display text-3xl font-semibold" data-testid="product-price">{formatBRL(product.priceInCents)}</p>
          <p className="mt-2 text-sm text-ink/50" data-testid="product-stock">
            {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
          </p>
          <div className="mt-8">
            <AddToCart
              storeSlug={store.slug}
              item={{ productId: product.id, name: product.name, priceInCents: product.priceInCents, image: product.images[0] ?? null, stock: product.stock }}
            />
          </div>
          {product.description && (
            <div className="mt-10 border-t border-ink/10 pt-8">
              <p className="label">Descrição</p>
              <p className="whitespace-pre-line text-base leading-relaxed text-ink/70" data-testid="product-description">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
