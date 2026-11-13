import { NextResponse } from "next/server";
import { getStoreBySlug } from "@/lib/store";
import { buildProductFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

// F5.3: feed do Google Merchant Center — mesmo formato RSS+g: que o catálogo da Meta aceita.
export async function GET(_req: Request, { params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store || store.maintenanceMode) return new NextResponse("Not found", { status: 404 });

  const xml = await buildProductFeed(store);
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
}
