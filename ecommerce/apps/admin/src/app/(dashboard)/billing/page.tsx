import { prisma } from "@repo/db";
import { PLAN_LABEL } from "@repo/db/plans";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { BillingPlans } from "@/components/billing-plans";

const STATUS_LABEL = { ACTIVE: "Ativo", TRIALING: "Em teste", PAST_DUE: "Pagamento atrasado", CANCELED: "Cancelado" } as const;

export default async function BillingPage({ searchParams }: { searchParams: { success?: string } }) {
  const { storeId } = await requireSession("billing");
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return null;

  return (
    <>
      <PageHeader title="Cobrança" subtitle="Plano da sua loja e limites de uso." />
      {searchParams.success && (
        <p className="mb-6 rounded-lg border border-lime bg-lime/30 px-3 py-2 text-sm" data-testid="billing-success">Assinatura confirmada!</p>
      )}
      <p className="mb-6 text-sm text-ink/70" data-testid="billing-status">
        Plano atual: <strong>{PLAN_LABEL[store.plan]}</strong> · Status: <strong>{STATUS_LABEL[store.planStatus]}</strong>
      </p>
      <BillingPlans currentPlan={store.plan} hasSubscription={!!store.stripeSubscriptionId} />
    </>
  );
}
