import Link from "next/link";
import type { Product } from "@repo/db";
import { formatBRL } from "@repo/db/utils";
import { ProductImage } from "./product-image";

type Props = { base: string; product: Pick<Product, "id" | "slug" | "name" | "category" | "priceInCents" | "images" | "stock"> };

export function ProductCard({ base, product }: Props) {
  const soldOut = product.stock <= 0;
  return (
    <Link href={`${base}/produtos/${product.slug}`} className="group block" data-testid={`product-card-${product.id}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink/5">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          {product.category && <p className="text-[11px] uppercase tracking-[0.14em] text-ink/40">{product.category}</p>}
          <h3 className="font-medium leading-snug">{product.name}</h3>
        </div>
        <span className="shrink-0 font-display font-semibold">{formatBRL(product.priceInCents)}</span>
      </div>
    </Link>
  );
}
