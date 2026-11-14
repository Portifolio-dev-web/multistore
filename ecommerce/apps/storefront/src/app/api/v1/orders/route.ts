import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { authenticateApiKey, isApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!isApiAuth(auth)) return auth;

  const orders = await prisma.order.findMany({
    where: { storeId: auth.storeId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      totalInCents: o.totalInCents,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      items: o.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPriceInCents: i.unitPriceInCents })),
    })),
  });
}
