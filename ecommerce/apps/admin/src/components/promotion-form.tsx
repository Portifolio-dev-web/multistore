"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Promotion } from "@repo/db";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  promotion?: Promotion;
  products: { id: string; name: string }[];
  submitLabel: string;
};

export function PromotionForm({ action, promotion, products, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [type, setType] = useState(promotion?.type ?? "QUANTITY_DISCOUNT");
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="card max-w-2xl space-y-5 p-6" data-testid="promotion-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" defaultValue={promotion?.name} required className="field" data-testid="promotion-name-input" />
        <FieldError errors={e?.name} />
      </div>
      <div>
        <label className="label" htmlFor="type">Tipo</label>
        <select id="type" name="type" value={type} onChange={(ev) => setType(ev.target.value as typeof type)} className="field" data-testid="promotion-type-select">
          <option value="QUANTITY_DISCOUNT">Desconto progressivo por quantidade</option>
          <option value="BUY_X_PAY_Y">Leve X, pague Y</option>
        </select>
      </div>
      {type === "BUY_X_PAY_Y" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="buyQuantity">Leve (quantidade)</label>
            <input id="buyQuantity" name="buyQuantity" type="number" min={2} defaultValue={promotion?.buyQuantity ?? ""} required className="field" data-testid="promotion-buy-quantity-input" />
          </div>
          <div>
            <label className="label" htmlFor="payQuantity">Pague (quantidade)</label>
            <input id="payQuantity" name="payQuantity" type="number" min={1} defaultValue={promotion?.payQuantity ?? ""} required className="field" data-testid="promotion-pay-quantity-input" />
            <FieldError errors={e?.payQuantity} testId="promotion-pay-quantity-error" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="minQuantity">Quantidade mínima</label>
            <input id="minQuantity" name="minQuantity" type="number" min={2} defaultValue={promotion?.minQuantity ?? ""} required className="field" data-testid="promotion-min-quantity-input" />
            <FieldError errors={e?.minQuantity} testId="promotion-min-quantity-error" />
          </div>
          <div>
            <label className="label" htmlFor="percentOff">Desconto (%)</label>
            <input id="percentOff" name="percentOff" type="number" min={1} max={100} defaultValue={promotion?.percentOff ?? ""} required className="field" data-testid="promotion-percent-off-input" />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="productIds">Produtos (nenhum selecionado = toda a loja)</label>
        <select id="productIds" name="productIds" multiple defaultValue={promotion?.productIds ?? []} className="field h-40" data-testid="promotion-products-select">
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={promotion?.active ?? true} data-testid="promotion-active-checkbox" />
        Ativa
      </label>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="promotion-submit-button">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
