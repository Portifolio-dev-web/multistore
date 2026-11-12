"use client";

import Link from "next/link";
import { formatBRL } from "@repo/db/utils";
import { useCart, useHydrated, useStoreCart, type CartItem } from "@/lib/cart-store";
import { ProductImage } from "./product-image";
import { useStoreContext } from "./store-context";

export function CartView({ storeSlug }: { storeSlug: string }) {
  const { href } = useStoreContext();
  const items = useStoreCart(storeSlug);
  const hydrated = useHydrated();

  if (!hydrated) return <div className="mt-10 h-40 animate-pulse rounded-3xl bg-ink/5" />;

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-ink/15 p-16 text-center" data-testid="cart-empty">
        <p className="text-ink/50">Seu carrinho está vazio.</p>
        <Link href={href()} className="btn-brand mt-6" data-testid="cart-continue-shopping">Explorar produtos</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.priceInCents * i.quantity, 0);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white" data-testid="cart-items">
        {items.map((item) => (
          <CartLine key={item.variantId} storeSlug={storeSlug} item={item} />
        ))}
      </ul>
      <aside className="h-fit rounded-3xl bg-brand p-6 text-brand-contrast">
        <p className="text-xs uppercase tracking-[0.14em] opacity-70">Resumo</p>
        <div className="mt-4 flex items-baseline justify-between">
          <span>Subtotal</span>
          <span className="font-display text-3xl font-bold" data-testid="cart-subtotal">{formatBRL(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs opacity-70">Frete e impostos calculados no checkout.</p>
        <Link
          href={href("/checkout")}
          className="mt-6 block w-full rounded-full bg-accent px-6 py-3.5 text-center text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
          data-testid="cart-checkout-button"
        >
          Finalizar compra
        </Link>
      </aside>
    </div>
  );
}

function CartLine({ storeSlug, item }: { storeSlug: string; item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  return (
    <li className="flex gap-4 p-4" data-testid={`cart-item-${item.variantId}`}>
      <ProductImage src={item.image} alt={item.name} className="h-24 w-20 shrink-0 rounded-xl object-cover" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-3">
          <p className="font-medium">
            {item.name}
            {item.variantLabel && <span className="block text-xs text-ink/50">{item.variantLabel}</span>}
          </p>
          <p className="font-display font-semibold">{formatBRL(item.priceInCents * item.quantity)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-full border border-ink/15 text-sm">
            <button type="button" className="px-3 py-1.5" onClick={() => updateQuantity(storeSlug, item.variantId, item.quantity - 1)} data-testid={`cart-item-decrease-${item.variantId}`}>−</button>
            <span className="w-6 text-center" data-testid={`cart-item-qty-${item.variantId}`}>{item.quantity}</span>
            <button type="button" className="px-3 py-1.5" onClick={() => updateQuantity(storeSlug, item.variantId, item.quantity + 1)} data-testid={`cart-item-increase-${item.variantId}`}>+</button>
          </div>
          <button type="button" onClick={() => removeItem(storeSlug, item.variantId)} className="text-sm text-ink/50 hover:text-red-600" data-testid={`cart-item-remove-${item.variantId}`}>
            Remover
          </button>
        </div>
      </div>
    </li>
  );
}
