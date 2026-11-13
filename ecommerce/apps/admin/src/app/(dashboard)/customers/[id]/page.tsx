import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { formatBRL, ORDER_STATUS_LABEL, waLink } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, storeId },
    include: { addresses: { orderBy: { createdAt: "desc" } }, orders: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) notFound();

  const whatsappMessage = `Olá${customer.name ? `, ${customer.name.split(" ")[0]}` : ""}! Tudo bem?`;

  return (
    <>
      <Link href="/customers" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-customers-link">← clientes</Link>
      <PageHeader
        title={customer.name || customer.email}
        subtitle={customer.email}
        action={
          customer.phone && (
            <a href={waLink(customer.phone, whatsappMessage)} target="_blank" rel="noreferrer" className="btn-ghost" data-testid="customer-whatsapp-link">
              Falar no WhatsApp
            </a>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Pedido</th>
                <th className="th">Data</th>
                <th className="th">Status</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customer.orders.map((o) => (
                <tr key={o.id}>
                  <td className="td">
                    <Link href={`/orders/${o.id}`} className="font-medium hover:underline">#{o.number}</Link>
                  </td>
                  <td className="td text-ink/60">{dateFmt.format(o.createdAt)}</td>
                  <td className="td text-ink/60">{ORDER_STATUS_LABEL[o.status]}</td>
                  <td className="td text-right font-mono">{formatBRL(o.totalInCents)}</td>
                </tr>
              ))}
              {customer.orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="td py-10 text-center text-ink/50">Nenhum pedido ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="card divide-y divide-line">
          <div className="px-5 py-3.5">
            <p className="label mb-0.5">Telefone</p>
            <p className="text-sm">{customer.phone || "—"}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="label mb-0.5">CPF/CNPJ</p>
            <p className="text-sm">{customer.document || "—"}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="label mb-2">Endereços</p>
            {customer.addresses.length === 0 && <p className="text-sm text-ink/50">Nenhum endereço salvo.</p>}
            <ul className="space-y-2">
              {customer.addresses.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""} · {a.district} · {a.city}/{a.state} · {a.zip}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
