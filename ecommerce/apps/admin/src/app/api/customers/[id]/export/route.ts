import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";

/** F6.11: exportação de dados a pedido do cliente (LGPD) — tudo que a loja guarda sobre ele */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, storeId },
    include: {
      addresses: true,
      orders: { include: { items: true } },
      reviews: true,
    },
  });
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const body = JSON.stringify(customer, null, 2);
  return new NextResponse(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="cliente-${customer.id}.json"` },
  });
}
