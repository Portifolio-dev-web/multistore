"use client";

import { useState, useTransition } from "react";
import { PLAN_LABEL, PLAN_LIMITS, PLAN_ORDER, type PlanKey } from "@repo/db/plans";
import { formatBRL } from "@repo/db/utils";
import { createBillingCheckout, createBillingPortal } from "@/actions/billing";

export function BillingPlans({ currentPlan, hasSubscription }: { currentPlan: PlanKey; hasSubscription: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upgrade(plan: "ESSENCIAL" | "PRO") {
    setError(null);
    startTransition(async () => {
      const result = await createBillingCheckout(plan);
      if ("error" in result) setError(result.error);
      else window.location.href = result.url;
    });
  }

  function manage() {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPortal();
      if ("error" in result) setError(result.error);
      else window.location.href = result.url;
    });
  }

  return (
    <div>
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="billing-error">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;
          return (
            <div key={plan} className={`card p-5 ${isCurrent ? "border-ink" : ""}`} data-testid={`plan-card-${plan}`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/50">{PLAN_LABEL[plan]}</p>
              <p className="mt-2 text-2xl font-semibold">{limits.priceInCents === 0 ? "Grátis" : `${formatBRL(limits.priceInCents)}/mês`}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink/70">
                <li>Até {limits.maxProducts === Infinity ? "ilimitados" : limits.maxProducts} produtos</li>
                <li>Até {limits.maxUsers} usuário{limits.maxUsers > 1 ? "s" : ""} na equipe</li>
                <li>{limits.customDomain ? "Domínio próprio" : "Sem domínio próprio"}</li>
                <li>Taxa de {limits.feePercent}% por venda</li>
              </ul>
              {isCurrent ? (
                <p className="mt-5 text-center text-sm font-semibold text-ink/50" data-testid={`plan-current-${plan}`}>Plano atual</p>
              ) : plan === "FREE" ? null : (
                <button type="button" onClick={() => upgrade(plan)} disabled={pending} className="btn-brand mt-5 w-full" data-testid={`plan-upgrade-${plan}`}>
                  Fazer upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>
      {hasSubscription && (
        <button type="button" onClick={manage} disabled={pending} className="btn-ghost mt-6" data-testid="billing-manage-button">
          Gerenciar assinatura (Stripe)
        </button>
      )}
    </div>
  );
}
