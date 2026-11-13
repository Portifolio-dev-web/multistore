import { NextResponse } from "next/server";
import { storeUrl } from "@repo/db/urls";
import { getStoreBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) return new NextResponse("Not found", { status: 404 });

  const body = store.maintenanceMode
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nSitemap: ${storeUrl(store)}/sitemap.xml\n`;
  return new NextResponse(body, { headers: { "Content-Type": "text/plain" } });
}
