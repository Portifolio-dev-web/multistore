"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Coupon } from "@repo/db";
import { centsToInput } from "@repo/db/utils";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  coupon?: Coupon;
  submitLabel: string;
};

export function CouponForm({ action, coupon, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [type, setType] = useState(coupon?.type ?? "PERCENT");
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="card max-w-2xl space-y-5 p-6" data-testid="coupon-form">
      <FormMessage error={state.error} success={state.success} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="code">Código</label>
          <input id="code" name="code" defaultValue={coupon?.code} required className="field font-mono uppercase" data-testid="coupon-code-input" />
          <FieldError errors={e?.code} testId="coupon-code-error" />
        </div>
        <div>
          <label className="label" htmlFor="type">Tipo</label>
          <select id="type" name="type" value={type} onChange={(ev) => setType(ev.target.value as typeof type)} className="field" data-testid="coupon-type-select">
            <option value="PERCENT">Porcentagem</option>
            <option value="FIXED">Valor fixo</option>
            <option value="FREE_SHIPPING">Frete grátis</option>
          </select>
        </div>
      </div>
      {type !== "FREE_SHIPPING" && (
        <div>
          <label className="label" htmlFor="value">{type === "PERCENT" ? "Porcentagem de desconto" : "Valor do desconto (R$)"}</label>
          <input
            id="value"
            name="value"
            defaultValue={coupon ? (coupon.type === "PERCENT" ? String(coupon.value) : centsToInput(coupon.value)) : ""}
            placeholder={type === "PERCENT" ? "10" : "20,00"}
            required
            className="field"
            data-testid="coupon-value-input"
          />
          <FieldError errors={e?.value} testId="coupon-value-error" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="minOrder">Pedido mínimo (R$, opcional)</label>
        <input id="minOrder" name="minOrder" defaultValue={coupon?.minOrderInCents ? centsToInput(coupon.minOrderInCents) : ""} className="field" data-testid="coupon-min-order-input" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="startsAt">Início (opcional)</label>
          <input id="startsAt" name="startsAt" type="date" defaultValue={toDateInput(coupon?.startsAt ?? null)} className="field" data-testid="coupon-starts-at-input" />
        </div>
        <div>
          <label className="label" htmlFor="endsAt">Fim (opcional)</label>
          <input id="endsAt" name="endsAt" type="date" defaultValue={toDateInput(coupon?.endsAt ?? null)} className="field" data-testid="coupon-ends-at-input" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="maxUses">Limite total de usos (opcional)</label>
          <input id="maxUses" name="maxUses" type="number" min={1} defaultValue={coupon?.maxUses ?? ""} className="field" data-testid="coupon-max-uses-input" />
        </div>
        <div>
          <label className="label" htmlFor="maxUsesPerCustomer">Limite por cliente (opcional)</label>
          <input id="maxUsesPerCustomer" name="maxUsesPerCustomer" type="number" min={1} defaultValue={coupon?.maxUsesPerCustomer ?? ""} className="field" data-testid="coupon-max-per-customer-input" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} data-testid="coupon-active-checkbox" />
        Ativo
      </label>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="coupon-submit-button">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
