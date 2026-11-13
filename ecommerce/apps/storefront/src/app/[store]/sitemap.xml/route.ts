import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { storeUrl } from "@repo/db/urls";
import { getStoreBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

function urlEntry(loc: string, lastmod?: Date): string {
  return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}</url>`;
}

// F5.1: um sitemap por loja — rota literal (não o arquivo especial sitemap.ts) pra funcionar
// igual em domínio próprio, subdomínio e caminho /{slug} (o middleware já reescreve pra cá).
export async function GET(_req: Request, { params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store || store.maintenanceMode) return new NextResponse("Not found", { status: 404 });

  const base = storeUrl(store);
  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({ where: { storeId: store.id, active: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { storeId: store.id }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { storeId: store.id, published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const urls = [
    urlEntry(base, store.updatedAt),
    urlEntry(`${base}/busca`),
    ...products.map((p) => urlEntry(`${base}/produtos/${p.slug}`, p.updatedAt)),
    ...categories.map((c) => urlEntry(`${base}/categorias/${c.slug}`, c.updatedAt)),
    ...pages.map((p) => urlEntry(`${base}/p/${p.slug}`, p.updatedAt)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
}
