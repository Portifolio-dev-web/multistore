import { NextResponse } from "next/server";
import { exportCustomerData } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";

// LGPD art. 18 (acesso/portabilidade): o próprio titular baixa tudo que a loja guarda sobre ele.
export async function GET(_req: Request, { params }: { params: Promise<{ store: string }> }) {
  const store = await getStoreBySlug((await params).store);
  const session = store && (await getCustomerForStore(store.id));
  if (!store || !session) return NextResponse.json({ error: "Faça login para baixar seus dados." }, { status: 401 });

  const data = await exportCustomerData(session.customerId, store.id);
  if (!data) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="meus-dados.json"' },
  });
}
