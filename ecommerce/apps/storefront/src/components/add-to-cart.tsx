"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart-store";
import { useStoreContext } from "./store-context";

type Props = { storeSlug: string; item: Omit<CartItem, "quantity"> };

export function AddToCart({ storeSlug, item }: Props) {
  const { href } = useStoreContext();
  const addItem = useCart((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = item.stock <= 0;

  const add = () => {
    addItem(storeSlug, item, qty);
    setAdded(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-ink/15 bg-white">
          <button type="button" className="px-4 py-3" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={soldOut} data-testid="qty-decrease-button">−</button>
          <span className="w-8 text-center font-semibold" data-testid="qty-value">{qty}</span>
          <button type="button" className="px-4 py-3" onClick={() => setQty((q) => Math.min(item.stock, q + 1))} disabled={soldOut} data-testid="qty-increase-button">+</button>
        </div>
        <button type="button" onClick={add} disabled={soldOut} className="btn-brand flex-1" data-testid="add-to-cart-button">
          {soldOut ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      </div>
      {added && (
        <p className="text-sm text-ink/60" data-testid="add-to-cart-confirmation">
          Adicionado! <Link href={href("/cart")} className="font-semibold underline underline-offset-4">Ver carrinho</Link>
        </p>
      )}
    </div>
  );
}
