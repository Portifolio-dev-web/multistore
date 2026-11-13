import Link from "next/link";
import { prisma } from "@repo/db";
import { centsToInput } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

const TYPE_LABEL = { PERCENT: "Porcentagem", FIXED: "Valor fixo", FREE_SHIPPING: "Frete grátis" } as const;

export default async function CouponsPage() {
  const { storeId } = await requireSession();
  const coupons = await prisma.coupon.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Cupons"
        subtitle={`${coupons.length} no total`}
        action={<Link href="/coupons/new" className="btn" data-testid="new-coupon-button">+ Novo cupom</Link>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]" data-testid="coupons-table">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Código</th>
              <th className="th">Tipo</th>
              <th className="th">Valor</th>
              <th className="th">Usos</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-bone/60">
                <td className="td">
                  <Link href={`/coupons/${c.id}`} className="font-mono font-medium hover:underline" data-testid={`coupon-row-${c.id}`}>{c.code}</Link>
                </td>
                <td className="td text-ink/60">{TYPE_LABEL[c.type]}</td>
                <td className="td font-mono text-ink/60">{c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? `R$ ${centsToInput(c.value)}` : "—"}</td>
                <td className="td text-ink/60">{c.usesCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="td">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.active ? "bg-lime/30 text-ink" : "bg-ink/10 text-ink/50"}`}>
                    {c.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-14 text-center text-ink/50">Nenhum cupom. Crie o primeiro!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
