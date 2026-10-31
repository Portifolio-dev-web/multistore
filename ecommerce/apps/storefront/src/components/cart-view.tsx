"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatBRL } from "@repo/db/utils";
import { useCart, useHydrated, useStoreCart, type CartItem } from "@/lib/cart-store";
import { createCheckoutSession } from "@/actions/checkout";
import { ProductImage } from "./product-image";

export function CartView({ storeSlug }: { storeSlug: string }) {
  const items = useStoreCart(storeSlug);
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <div className="mt-10 h-40 animate-pulse rounded-3xl bg-ink/5" />;

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-ink/15 p-16 text-center" data-testid="cart-empty">
        <p className="text-ink/50">Seu carrinho está vazio.</p>
        <Link href={`/${storeSlug}`} className="btn-brand mt-6" data-testid="cart-continue-shopping">Explorar produtos</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.priceInCents * i.quantity, 0);

  const checkout = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession({
        storeSlug,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if ("error" in result) setError(result.error);
      else window.location.href = result.url;
    });
  };

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white" data-testid="cart-items">
        {items.map((item) => (
          <CartLine key={item.productId} storeSlug={storeSlug} item={item} />
        ))}
      </ul>
      <aside className="h-fit rounded-3xl bg-brand p-6 text-brand-contrast">
        <p className="text-xs uppercase tracking-[0.14em] opacity-70">Resumo</p>
        <div className="mt-4 flex items-baseline justify-between">
          <span>Subtotal</span>
          <span className="font-display text-3xl font-bold" data-testid="cart-subtotal">{formatBRL(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs opacity-70">Frete e impostos calculados no checkout.</p>
        <button
          type="button"
          onClick={checkout}
          disabled={pending}
          className="mt-6 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          data-testid="cart-checkout-button"
        >
          {pending ? "Redirecionando…" : "Finalizar compra"}
        </button>
        {error && <p className="mt-3 rounded-xl bg-white/90 p-3 text-sm text-red-700" data-testid="cart-checkout-error">{error}</p>}
      </aside>
    </div>
  );
}

function CartLine({ storeSlug, item }: { storeSlug: string; item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  return (
    <li className="flex gap-4 p-4" data-testid={`cart-item-${item.productId}`}>
      <ProductImage src={item.image} alt={item.name} className="h-24 w-20 shrink-0 rounded-xl object-cover" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-3">
          <p className="font-medium">{item.name}</p>
          <p className="font-display font-semibold">{formatBRL(item.priceInCents * item.quantity)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-full border border-ink/15 text-sm">
            <button type="button" className="px-3 py-1.5" onClick={() => updateQuantity(storeSlug, item.productId, item.quantity - 1)} data-testid={`cart-item-decrease-${item.productId}`}>−</button>
            <span className="w-6 text-center" data-testid={`cart-item-qty-${item.productId}`}>{item.quantity}</span>
            <button type="button" className="px-3 py-1.5" onClick={() => updateQuantity(storeSlug, item.productId, item.quantity + 1)} data-testid={`cart-item-increase-${item.productId}`}>+</button>
          </div>
          <button type="button" onClick={() => removeItem(storeSlug, item.productId)} className="text-sm text-ink/50 hover:text-red-600" data-testid={`cart-item-remove-${item.productId}`}>
            Remover
          </button>
        </div>
      </div>
    </li>
  );
}
