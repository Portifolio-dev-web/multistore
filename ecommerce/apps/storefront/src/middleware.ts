import { NextResponse, type NextRequest } from "next/server";

// Host -> loja. Domínio principal: rotas /{slug}. Subdomínio ou domínio próprio: rotas na raiz.
const STORE_MODE_HEADER = "x-store-mode";
const cache = new Map<string, { slug: string | null; expires: number }>();

async function resolveCustomDomain(host: string): Promise<string | null> {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.slug;

  let slug: string | null = null;
  try {
    const res = await fetch(`${process.env.STOREFRONT_INTERNAL_URL}/api/domains/resolve?host=${encodeURIComponent(host)}`, { cache: "no-store" });
    if (res.ok) slug = ((await res.json()) as { slug: string }).slug;
  } catch (err) {
    console.error("[middleware] falha ao resolver domínio", host, err);
  }
  cache.set(host, { slug, expires: Date.now() + (slug ? 60_000 : 15_000) });
  return slug;
}

function stripModeHeader(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete(STORE_MODE_HEADER); // impede spoofing pelo cliente
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const mainHost = new URL(process.env.STOREFRONT_URL!).host.toLowerCase();
  const root = process.env.STOREFRONT_ROOT_DOMAIN?.toLowerCase();

  if (!host || host === mainHost) return stripModeHeader(req);

  let slug: string | null = null;
  if (root && host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    slug = sub && !sub.includes(".") && sub !== "www" ? sub : null;
  } else {
    slug = await resolveCustomDomain(host.split(":")[0]);
  }
  if (!slug) return stripModeHeader(req);

  const { pathname } = req.nextUrl;
  // Links antigos no formato /{slug}/... viram URLs limpas
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(slug.length + 1) || "/";
    return NextResponse.redirect(url);
  }

  const headers = new Headers(req.headers);
  headers.set(STORE_MODE_HEADER, "tenant");
  const url = req.nextUrl.clone();
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
