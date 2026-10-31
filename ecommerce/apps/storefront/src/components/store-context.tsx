"use client";

import { createContext, useContext } from "react";

type StoreContextValue = { slug: string; base: string };

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ value, children }: { value: StoreContextValue; children: React.ReactNode }) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStoreContext(): StoreContextValue & { href: (path?: string) => string } {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreContext precisa de <StoreProvider>");
  return { ...ctx, href: (path = "") => `${ctx.base}${path}` || "/" };
}
