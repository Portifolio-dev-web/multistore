// F6.3: planos do lojista (assinatura paga à plataforma via Stripe Billing — não tem relação com o
// Stripe do checkout da vitrine, que é uma conta global única, ver Decisões da F1.4).
export type PlanKey = "FREE" | "ESSENCIAL" | "PRO";

export const PLAN_LABEL: Record<PlanKey, string> = { FREE: "Grátis", ESSENCIAL: "Essencial", PRO: "Pro" };

export type PlanLimits = {
  maxProducts: number;
  maxUsers: number;
  customDomain: boolean;
  /** Taxa por venda exibida na página de planos — não é cobrada de verdade hoje (ver Decisões da F6.3) */
  feePercent: number;
  priceInCents: number;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  FREE: { maxProducts: 20, maxUsers: 1, customDomain: false, feePercent: 5, priceInCents: 0 },
  ESSENCIAL: { maxProducts: 500, maxUsers: 3, customDomain: true, feePercent: 2, priceInCents: 4990 },
  PRO: { maxProducts: Infinity, maxUsers: 10, customDomain: true, feePercent: 0, priceInCents: 14990 },
};

export const PLAN_ORDER: PlanKey[] = ["FREE", "ESSENCIAL", "PRO"];

export function withinProductLimit(plan: PlanKey, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxProducts;
}

export function withinUserLimit(plan: PlanKey, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxUsers;
}

export function planAllowsCustomDomain(plan: PlanKey): boolean {
  return PLAN_LIMITS[plan].customDomain;
}
