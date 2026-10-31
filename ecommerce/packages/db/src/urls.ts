// URLs públicas das lojas (somente servidor: lê variáveis de ambiente)

type StoreAddress = { slug: string; customDomain: string | null };

function storefrontBase(): URL {
  const raw = process.env.STOREFRONT_URL;
  if (!raw) throw new Error("Variável de ambiente ausente: STOREFRONT_URL");
  return new URL(raw);
}

/** Endereço público da loja: domínio próprio > subdomínio > caminho /slug */
export function storeUrl(store: StoreAddress): string {
  const base = storefrontBase();
  if (store.customDomain) return `${base.protocol}//${store.customDomain}`;
  const root = process.env.STOREFRONT_ROOT_DOMAIN;
  if (root) return `${base.protocol}//${store.slug}.${root}`;
  return `${base.origin}/${store.slug}`;
}

export function orderTrackingUrl(store: StoreAddress, publicToken: string): string {
  return `${storeUrl(store)}/pedido/${publicToken}`;
}
