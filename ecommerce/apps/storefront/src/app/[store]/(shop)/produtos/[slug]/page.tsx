import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { ProductVariantPicker } from "@/components/product-variant-picker";

type Props = { params: { store: string; slug: string } };

export default async function ProductPage({ params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const product = await prisma.product.findFirst({
    where: { slug: params.slug, storeId: store.id, active: true },
    include: {
      categories: { select: { name: true, slug: true } },
      options: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  if (!product) {
    // Slug antigo (produto renomeado)? Redireciona pro endereço atual.
    const redirect = await prisma.slugRedirect.findUnique({
      where: { storeId_fromSlug: { storeId: store.id, fromSlug: params.slug } },
      include: { product: true },
    });
    if (redirect?.product.active) {
      permanentRedirect(storeHref(getStoreBase(store.slug), `/produtos/${redirect.product.slug}`));
    }
    notFound();
  }

  const base = getStoreBase(store.slug);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <Link href={base || "/"} className="text-sm text-ink/50 hover:text-ink" data-testid="product-back-link">← Voltar à vitrine</Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <ProductVariantPicker
          storeSlug={store.slug}
          product={product}
          options={product.options.map((o) => ({ name: o.name, values: o.values }))}
          variants={product.variants.map((v) => ({
            id: v.id,
            combination: v.combination as Record<string, string>,
            sku: v.sku,
            priceInCents: v.priceInCents,
            compareAtPriceInCents: v.compareAtPriceInCents,
            stock: v.stock,
            imageUrl: v.imageUrl,
          }))}
          header={
            <>
              {product.categories.length > 0 && (
                <p className="label space-x-2">
                  {product.categories.map((c) => (
                    <Link key={c.slug} href={storeHref(base, `/categorias/${c.slug}`)} className="hover:underline" data-testid={`product-category-link-${c.slug}`}>
                      {c.name}
                    </Link>
                  ))}
                </p>
              )}
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl" data-testid="product-name">{product.name}</h1>
            </>
          }
          footer={
            product.description && (
              <div className="mt-10 border-t border-ink/10 pt-8">
                <p className="label">Descrição</p>
                <p className="whitespace-pre-line text-base leading-relaxed text-ink/70" data-testid="product-description">{product.description}</p>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
