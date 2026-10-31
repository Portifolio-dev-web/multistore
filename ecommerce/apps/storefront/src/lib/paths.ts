import { headers } from "next/headers";

/** Prefixo dos links da loja: "" em subdomínio/domínio próprio, "/{slug}" no domínio principal */
export function getStoreBase(slug: string): string {
  return headers().get("x-store-mode") === "tenant" ? "" : `/${slug}`;
}

export function storeHref(base: string, path = ""): string {
  return `${base}${path}` || "/";
}
