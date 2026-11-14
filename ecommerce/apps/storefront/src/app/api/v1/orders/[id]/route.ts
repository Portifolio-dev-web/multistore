import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { authenticateApiKey, isApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!isApiAuth(auth)) return auth;

  const order = await prisma.order.findFirst({ where: { id: params.id, storeId: auth.storeId }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: order.id,
      number: order.number,
      status: order.status,
      totalInCents: order.totalInCents,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      items: order.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPriceInCents: i.unitPriceInCents })),
    },
  });
}
