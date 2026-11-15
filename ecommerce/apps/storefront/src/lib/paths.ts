import { headers } from "next/headers";

/** Prefixo dos links da loja: "" em subdomínio/domínio próprio, "/{slug}" no domínio principal */
export async function getStoreBase(slug: string): Promise<string> {
  return (await headers()).get("x-store-mode") === "tenant" ? "" : `/${slug}`;
}

export function storeHref(base: string, path = ""): string {
  return `${base}${path}` || "/";
}
