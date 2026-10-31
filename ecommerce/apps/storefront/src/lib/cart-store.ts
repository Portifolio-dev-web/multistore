"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  priceInCents: number;
  image: string | null;
  stock: number;
  quantity: number;
};

type CartState = {
  carts: Record<string, CartItem[]>;
  addItem: (store: string, item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (store: string, productId: string, quantity: number) => void;
  removeItem: (store: string, productId: string) => void;
  clearCart: (store: string) => void;
};

const clamp = (q: number, stock: number) => Math.max(1, Math.min(q, stock));

// Um carrinho por loja (multi-loja), persistido no localStorage
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      addItem: (store, item, quantity = 1) =>
        set((s) => {
          const cart = s.carts[store] ?? [];
          const existing = cart.find((i) => i.productId === item.productId);
          const next = existing
            ? cart.map((i) => (i.productId === item.productId ? { ...i, ...item, quantity: clamp(i.quantity + quantity, item.stock) } : i))
            : [...cart, { ...item, quantity: clamp(quantity, item.stock) }];
          return { carts: { ...s.carts, [store]: next } };
        }),
      updateQuantity: (store, productId, quantity) =>
        set((s) => ({
          carts: {
            ...s.carts,
            [store]: (s.carts[store] ?? []).map((i) => (i.productId === productId ? { ...i, quantity: clamp(quantity, i.stock) } : i)),
          },
        })),
      removeItem: (store, productId) =>
        set((s) => ({ carts: { ...s.carts, [store]: (s.carts[store] ?? []).filter((i) => i.productId !== productId) } })),
      clearCart: (store) => set((s) => ({ carts: { ...s.carts, [store]: [] } })),
    }),
    { name: "vitrine-cart" },
  ),
);

const EMPTY: CartItem[] = [];

export function useStoreCart(store: string): CartItem[] {
  return useCart((s) => s.carts[store] ?? EMPTY);
}

/** Evita mismatch de hidratação com o localStorage */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
