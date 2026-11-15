import { NextResponse } from "next/server";
import { exportCustomerData } from "@repo/db";
import { requireSession } from "@/lib/session";

/** F6.11: exportação de dados a pedido do cliente (LGPD) — tudo que a loja guarda sobre ele */
export async function GET(_req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { storeId } = await requireSession();
  const customer = await exportCustomerData(params.id, storeId);
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  return new NextResponse(JSON.stringify(customer, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="cliente-${customer.id}.json"` },
  });
}
