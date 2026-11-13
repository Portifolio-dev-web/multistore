import Link from "next/link";
import { prisma } from "@repo/db";
import { formatBRL, ORDER_STATUS_LABEL } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { getStoreBase, storeHref } from "@/lib/paths";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function AccountOrdersPage({ params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  const session = await getCustomerForStore(store!.id);
  const base = getStoreBase(params.store);

  const orders = await prisma.order.findMany({
    where: { customerId: session!.customerId, storeId: store!.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div data-testid="account-orders">
      <h1 className="font-display text-2xl font-bold tracking-tight">Meus pedidos</h1>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-ink/50" data-testid="account-orders-empty">Você ainda não fez nenhum pedido nesta loja.</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white" data-testid="account-orders-list">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">Pedido #{o.number}</p>
                <p className="text-xs text-ink/50">{dateFmt.format(o.createdAt)} · {ORDER_STATUS_LABEL[o.status]}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatBRL(o.totalInCents)}</span>
                <Link href={storeHref(base, `/pedido/${o.publicToken}`)} className="text-ink/60 hover:text-ink" data-testid={`account-order-link-${o.number}`}>
                  Ver →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
