// F5.1: JSON-LD estrutural — sempre serializado com escape de "<" pra nunca fechar a <script> cedo.
export function jsonLdScriptProps(data: unknown) {
  return { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") } };
}

export function organizationJsonLd(store: { name: string; description: string | null; logoUrl: string | null }, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    url,
    ...(store.description ? { description: store.description } : {}),
    ...(store.logoUrl ? { logo: store.logoUrl } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

export function productJsonLd(opts: {
  url: string;
  name: string;
  description: string;
  images: string[];
  priceInCents: number;
  currency: string;
  inStock: boolean;
  brand: string | null;
  gtin: string | null;
  sku: string | null;
  rating: { value: number; count: number } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description || undefined,
    image: opts.images,
    url: opts.url,
    ...(opts.brand ? { brand: { "@type": "Brand", name: opts.brand } } : {}),
    ...(opts.gtin ? { gtin: opts.gtin } : {}),
    ...(opts.sku ? { sku: opts.sku } : {}),
    offers: {
      "@type": "Offer",
      url: opts.url,
      priceCurrency: opts.currency.toUpperCase(),
      price: (opts.priceInCents / 100).toFixed(2),
      availability: opts.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(opts.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: opts.rating.value, reviewCount: opts.rating.count } }
      : {}),
  };
}
