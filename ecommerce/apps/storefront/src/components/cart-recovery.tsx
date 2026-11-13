"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart-store";
import { useStoreContext } from "./store-context";

export function CartRecovery({ storeSlug, items }: { storeSlug: string; items: CartItem[] }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { href } = useStoreContext();

  useEffect(() => {
    for (const item of items) {
      const { quantity, ...rest } = item;
      addItem(storeSlug, rest, quantity);
    }
    router.replace(href("/cart"));
    // roda só na montagem — restaurar o carrinho é uma ação única, não deve repetir a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p className="mx-auto max-w-sm px-5 py-20 text-center text-ink/50">Restaurando seu carrinho…</p>;
}
