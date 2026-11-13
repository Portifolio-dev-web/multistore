"use client";

import { useMemo, useState } from "react";
import {
  combinationKey,
  effectiveCompareAtPrice,
  effectivePrice,
  formatBRL,
  isPromoActive,
  promoDiscountPercent,
  variantLabel,
  waLink,
} from "@repo/db/utils";
import { AddToCart } from "./add-to-cart";
import { ProductGallery } from "./product-gallery";

type VariantData = {
  id: string;
  combination: Record<string, string>;
  sku: string | null;
  priceInCents: number | null;
  compareAtPriceInCents: number | null;
  stock: number;
  imageUrl: string | null;
};

type Props = {
  storeSlug: string;
  product: {
    id: string;
    name: string;
    priceInCents: number;
    compareAtPriceInCents: number | null;
    promoStartsAt: Date | null;
    promoEndsAt: Date | null;
    images: string[];
    imageAlts: string[];
  };
  options: { name: string; values: string[] }[];
  variants: VariantData[];
  whatsappPhone?: string | null;
  // Categorias/título e descrição não dependem da variante escolhida — renderizados no servidor
  // e encaixados em volta do bloco dinâmico (preço/opções/carrinho).
  header: React.ReactNode;
  footer?: React.ReactNode;
};

export function ProductVariantPicker({ storeSlug, product, options, variants, whatsappPhone, header, footer }: Props) {
  const optionNames = options.map((o) => o.name);
  const byKey = useMemo(() => new Map(variants.map((v) => [combinationKey(v.combination), v])), [variants]);
  const initialCombination = useMemo(
    () => (variants.find((v) => v.stock > 0) ?? variants[0])?.combination ?? {},
    [variants],
  );

  const [selected, setSelected] = useState<Record<string, string>>(initialCombination);
  const variant = byKey.get(combinationKey(selected));

  const priceInCents = variant ? effectivePrice(variant, product) : product.priceInCents;
  const compareAtPriceInCents = variant ? effectiveCompareAtPrice(variant, product) : product.compareAtPriceInCents;
  const stock = variant?.stock ?? 0;
  const onPromo = isPromoActive({ priceInCents, compareAtPriceInCents, promoStartsAt: product.promoStartsAt, promoEndsAt: product.promoEndsAt });
  const imageUrls = variant?.imageUrl ? [variant.imageUrl, ...product.images] : product.images;
  const images = imageUrls.map((url, i) => ({ url, alt: (variant?.imageUrl ? product.imageAlts[i - 1] : product.imageAlts[i]) || product.name }));

  // Esgotado só nessa combinação: trava o valor sem esconder o botão (mesma combinação com os
  // outros valores já escolhidos fixos — não recalcula o resto da seleção).
  const isValueAvailable = (optionName: string, value: string) => {
    const match = byKey.get(combinationKey({ ...selected, [optionName]: value }));
    return !!match && match.stock > 0;
  };

  return (
    <>
      <ProductGallery key={variant?.id ?? "no-variant"} images={images} name={product.name} />
      <div className="animate-rise lg:pt-6" data-testid="product-variant-picker">
        {header}
        <div className="mt-5 flex items-center gap-3">
          {onPromo && (
            <span className="text-lg text-ink/40 line-through" data-testid="product-compare-price">
              {formatBRL(compareAtPriceInCents!)}
            </span>
          )}
          <p className="font-display text-3xl font-semibold" data-testid="product-price">{formatBRL(priceInCents)}</p>
          {onPromo && (
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-wider text-paper" data-testid="product-promo-badge">
              -{promoDiscountPercent(compareAtPriceInCents!, priceInCents)}%
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-ink/50" data-testid="product-stock">
          {stock > 0 ? `${stock} em estoque` : "Esgotado"}
        </p>

        {options.length > 0 && (
          <div className="mt-6 space-y-4">
            {options.map((option) => (
              <div key={option.name}>
                <p className="label">{option.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const active = selected[option.name] === value;
                    const available = isValueAvailable(option.name, value);
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={!available}
                        onClick={() => setSelected((s) => ({ ...s, [option.name]: value }))}
                        data-testid={`variant-option-${option.name}-${value}`}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          active ? "border-brand bg-brand text-brand-contrast" : "border-ink/15"
                        } ${available ? "hover:border-ink/40" : "cursor-not-allowed text-ink/30 line-through"}`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {variant && (
          <div className="mt-8">
            <AddToCart
              key={variant.id}
              storeSlug={storeSlug}
              item={{
                variantId: variant.id,
                productId: product.id,
                variantLabel: variantLabel(variant.combination, optionNames),
                name: product.name,
                priceInCents,
                image: images[0]?.url ?? null,
                stock,
              }}
            />
            {whatsappPhone && (
              <a
                href={waLink(whatsappPhone, `Olá! Quero comprar "${product.name}"${variant.sku ? ` (SKU ${variant.sku})` : ""}.`)}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost mt-3 w-full"
                data-testid="product-whatsapp-buy-button"
              >
                Comprar pelo WhatsApp
              </a>
            )}
          </div>
        )}
        {footer}
      </div>
    </>
  );
}
