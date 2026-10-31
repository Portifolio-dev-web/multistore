"use client";

import Link from "next/link";
import { useHydrated, useStoreCart } from "@/lib/cart-store";
import { useStoreContext } from "./store-context";

export function CartBadge() {
  const { slug, href } = useStoreContext();
  const items = useStoreCart(slug);
  const hydrated = useHydrated();
  const count = hydrated ? items.reduce((n, i) => n + i.quantity, 0) : 0;

  return (
    <Link href={href("/cart")} className="btn-ghost gap-2 bg-white" data-testid="header-cart-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      Carrinho
      <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold leading-5 text-brand-contrast" data-testid="header-cart-count">
        {count}
      </span>
    </Link>
  );
}
