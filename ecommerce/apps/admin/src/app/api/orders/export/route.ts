import { prisma } from "@repo/db";
import { buildCsv, formatBRL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";

export async function GET(req: Request) {
  const { storeId } = await requireSession();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(`${searchParams.get("to")}T23:59:59`) : undefined;

  const orders = await prisma.order.findMany({
    where: { storeId, ...(from || to ? { createdAt: { gte: from, lte: to } } : {}) },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    ["numero", "status", "cliente", "email", "total", "desconto", "cupom", "criado_em", "pago_em"],
    ...orders.map((o) => [
      String(o.number),
      ORDER_STATUS_LABEL[o.status],
      o.customerName ?? "",
      o.customerEmail ?? "",
      formatBRL(o.totalInCents),
      formatBRL(o.discountInCents),
      o.couponCode ?? "",
      o.createdAt.toISOString(),
      o.paidAt?.toISOString() ?? "",
    ]),
  ];

  const body = `﻿${buildCsv(rows)}`;
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pedidos.csv"` },
  });
}
