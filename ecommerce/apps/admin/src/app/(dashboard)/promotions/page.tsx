import Link from "next/link";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

const TYPE_LABEL = { BUY_X_PAY_Y: "Leve X, pague Y", QUANTITY_DISCOUNT: "Desconto por quantidade" } as const;

export default async function PromotionsPage() {
  const { storeId } = await requireSession();
  const promotions = await prisma.promotion.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Promoções automáticas"
        subtitle={`${promotions.length} no total`}
        action={<Link href="/promotions/new" className="btn" data-testid="new-promotion-button">+ Nova promoção</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]" data-testid="promotions-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Nome</th>
              <th className="th">Tipo</th>
              <th className="th">Regra</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {promotions.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-bone/60">
                <td className="td">
                  <Link href={`/promotions/${p.id}`} className="font-medium hover:underline" data-testid={`promotion-row-${p.id}`}>{p.name}</Link>
                </td>
                <td className="td text-ink/60">{TYPE_LABEL[p.type]}</td>
                <td className="td font-mono text-xs text-ink/60">
                  {p.type === "BUY_X_PAY_Y" ? `leve ${p.buyQuantity}, pague ${p.payQuantity}` : `${p.minQuantity}+ un. = ${p.percentOff}% off`}
                </td>
                <td className="td">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.active ? "bg-lime/30 text-ink" : "bg-ink/10 text-ink/50"}`}>
                    {p.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={4} className="td py-14 text-center text-ink/50">Nenhuma promoção. Crie a primeira!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
