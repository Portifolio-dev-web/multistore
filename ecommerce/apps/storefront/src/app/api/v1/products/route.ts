import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { authenticateApiKey, isApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!isApiAuth(auth)) return auth;

  const products = await prisma.product.findMany({
    where: { storeId: auth.storeId },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceInCents: p.priceInCents,
      active: p.active,
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, combination: v.combination, stock: v.stock, priceInCents: v.priceInCents })),
    })),
  });
}
