import Link from "next/link";
import type { Product } from "@repo/db";
import { averageRating, formatBRL, isPromoActive, promoDiscountPercent } from "@repo/db/utils";
import { ProductImage } from "./product-image";
import { Stars } from "./stars";

type Props = {
  base: string;
  // preço/estoque já resolvidos pelo chamador (produto ou variante padrão — F2.2 etapa 1)
  product: Pick<Product, "id" | "slug" | "name" | "promoStartsAt" | "promoEndsAt" | "images" | "imageAlts"> & {
    priceInCents: number;
    compareAtPriceInCents: number | null;
    stock: number;
    categories: { name: string }[];
    reviews: { rating: number }[];
  };
};

export function ProductCard({ base, product }: Props) {
  const soldOut = product.stock <= 0;
  const onPromo = isPromoActive(product);
  const avgRating = averageRating(product.reviews.map((r) => r.rating));
  return (
    <Link href={`${base}/produtos/${product.slug}`} className="group block" data-testid={`product-card-${product.id}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink/5">
        <ProductImage
          src={product.images[0]}
          alt={product.imageAlts[0] || product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(min-width: 1024px) 33vw, 50vw"
        />
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper">
            Esgotado
          </span>
        )}
        {!soldOut && product.stock <= 3 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink">
            Últimas {product.stock}
          </span>
        )}
        {onPromo && (
          <span
            className="absolute right-3 top-3 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper"
            data-testid={`product-promo-badge-${product.id}`}
          >
            -{promoDiscountPercent(product.compareAtPriceInCents!, product.priceInCents)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          {product.categories[0] && <p className="text-[11px] uppercase tracking-[0.14em] text-ink/40">{product.categories[0].name}</p>}
          <h3 className="font-medium leading-snug">{product.name}</h3>
          {avgRating !== null && <Stars rating={avgRating} size="text-xs" />}
        </div>
        <span className="shrink-0 text-right">
          {onPromo && (
            <span className="block text-xs text-ink/40 line-through" data-testid={`product-compare-price-${product.id}`}>
              {formatBRL(product.compareAtPriceInCents!)}
            </span>
          )}
          <span className="font-display font-semibold">{formatBRL(product.priceInCents)}</span>
        </span>
      </div>
    </Link>
  );
}
