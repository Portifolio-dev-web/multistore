"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

export function ClearCart({ storeSlug }: { storeSlug: string }) {
  const clearCart = useCart((s) => s.clearCart);
  useEffect(() => clearCart(storeSlug), [clearCart, storeSlug]);
  return null;
}
