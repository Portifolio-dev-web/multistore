import { prisma } from "@repo/db";
import { formatBRL, waLink } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

type Item = { productName: string; quantity: number; unitPriceInCents: number };

export default async function AbandonedCartsPage() {
  const { storeId } = await requireSession();
  const carts = await prisma.abandonedCart.findMany({
    where: { storeId, recoveredOrderId: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Carrinhos abandonados" subtitle={`${carts.length} em aberto (últimos 100)`} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]" data-testid="abandoned-carts-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Cliente</th>
              <th className="th">Itens</th>
              <th className="th">Total</th>
              <th className="th">Quando</th>
              <th className="th">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {carts.map((c) => {
              const items = c.items as unknown as Item[];
              const total = items.reduce((s, i) => s + i.unitPriceInCents * i.quantity, 0);
              const message = `Olá${c.name ? `, ${c.name.split(" ")[0]}` : ""}! Vi que você deixou alguns itens no carrinho. Posso ajudar a finalizar a compra?`;
              return (
                <tr key={c.id} className="transition-colors hover:bg-bone/60" data-testid={`abandoned-cart-row-${c.id}`}>
                  <td className="td">
                    <p className="font-medium">{c.name || "—"}</p>
                    <p className="font-mono text-xs text-ink/50">{c.email}</p>
                  </td>
                  <td className="td text-ink/60">{items.reduce((s, i) => s + i.quantity, 0)} un.</td>
                  <td className="td font-medium">{formatBRL(total)}</td>
                  <td className="td text-ink/60">{dateFmt.format(c.createdAt)}</td>
                  <td className="td">
                    {c.phone ? (
                      <a href={waLink(c.phone, message)} target="_blank" rel="noreferrer" className="btn-ghost" data-testid={`abandoned-cart-whatsapp-${c.id}`}>
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-ink/40">sem telefone</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {carts.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-14 text-center text-ink/50">Nenhum carrinho abandonado em aberto.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
