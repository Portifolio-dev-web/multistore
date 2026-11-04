import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { PageHeader } from "@/components/page-header";
import { connectStripeAccount } from "@/actions/payments";

export default async function PaymentsPage() {
  const { storeId } = await requireSession();
  let store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) notFound();

  // Volta do onboarding do Stripe (ou visita de novo depois): atualiza o status com a API
  if (store.stripeAccountId && !store.stripeChargesEnabled) {
    try {
      const account = await getStripe().accounts.retrieve(store.stripeAccountId);
      store = await prisma.store.update({
        where: { id: storeId },
        data: { stripeDetailsSubmitted: account.details_submitted ?? false, stripeChargesEnabled: account.charges_enabled ?? false },
      });
    } catch (err) {
      console.error("[payments] falha ao consultar a conta Stripe", storeId, err);
    }
  }

  const feePercent = process.env.PLATFORM_FEE_PERCENT ?? "0";

  return (
    <>
      <PageHeader title="Pagamentos" subtitle="Conecte sua conta Stripe pra receber pelas vendas da sua loja." />
      <section className="card max-w-xl space-y-5 p-6">
        <div>
          <p className="label mb-1">Status</p>
          {store.stripeChargesEnabled ? (
            <span
              className="inline-flex rounded-full bg-lime px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-ink"
              data-testid="payments-status-active"
            >
              Recebendo pagamentos
            </span>
          ) : store.stripeAccountId ? (
            <span
              className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900"
              data-testid="payments-status-pending"
            >
              Cadastro incompleto
            </span>
          ) : (
            <span
              className="inline-flex rounded-full bg-stone-200 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-stone-700"
              data-testid="payments-status-none"
            >
              Nenhuma conta conectada
            </span>
          )}
        </div>

        {!store.stripeChargesEnabled && (
          <p className="text-sm text-ink/60">
            {store.stripeAccountId
              ? "O cadastro no Stripe ainda não foi concluído. Continue de onde parou."
              : "Conecte uma conta Stripe pra começar a vender — o onboarding é hospedado pelo próprio Stripe."}
          </p>
        )}

        <p className="text-sm text-ink/60">
          Taxa da plataforma sobre cada venda: <span className="font-mono text-ink">{feePercent}%</span>
        </p>

        {!store.stripeChargesEnabled && (
          <form action={connectStripeAccount}>
            <button type="submit" className="btn" data-testid="connect-stripe-button">
              {store.stripeAccountId ? "Continuar cadastro" : "Conectar conta"}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
