import { prisma } from "@repo/db";
import { buildCsv, formatBRL } from "@repo/db/utils";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { storeId } = await requireSession();
  const customers = await prisma.customer.findMany({ where: { storeId }, orderBy: { createdAt: "asc" } });

  const aggregates = await prisma.order.groupBy({
    by: ["customerId"],
    where: { storeId, status: "PAID", customerId: { not: null } },
    _sum: { totalInCents: true },
    _count: { _all: true },
  });
  const byCustomer = new Map(aggregates.map((a) => [a.customerId, a]));

  const rows = [
    ["nome", "email", "telefone", "documento", "aceita_marketing", "pedidos_pagos", "total_gasto"],
    ...customers.map((c) => {
      const agg = byCustomer.get(c.id);
      return [
        c.name ?? "",
        c.email,
        c.phone ?? "",
        c.document ?? "",
        c.acceptsMarketing ? "sim" : "não",
        String(agg?._count._all ?? 0),
        formatBRL(agg?._sum.totalInCents ?? 0),
      ];
    }),
  ];

  const body = `﻿${buildCsv(rows)}`;
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clientes.csv"` },
  });
}
