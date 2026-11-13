import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { productsToCsv } from "@/lib/product-csv";

export async function GET() {
  const { storeId } = await requireSession();
  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: { createdAt: "asc" },
    include: { categories: { select: { name: true } }, variants: { orderBy: { position: "asc" } } },
  });

  const csv = productsToCsv(products);
  // BOM pra abrir certo no Excel (acentos) — pedido explícito do roadmap
  const body = `﻿${csv}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos.csv"`,
    },
  });
}
