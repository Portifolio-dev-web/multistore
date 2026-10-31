"use client";

import { useFormState } from "react-dom";
import type { Order } from "@repo/db";
import { FULFILLMENT_LABEL, type FulfillmentStatusKey } from "@repo/db/utils";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  order: Pick<Order, "status" | "fulfillmentStatus" | "carrier" | "trackingCode" | "trackingUrl" | "customerEmail">;
};

export function FulfillmentForm({ action, order }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const disabled = order.status !== "PAID";

  return (
    <form action={formAction} className="card space-y-4 p-5" data-testid="fulfillment-form">
      <h2 className="font-semibold">Entrega</h2>
      {disabled && <p className="text-sm text-ink/60">Disponível depois que o pagamento for confirmado.</p>}
      <FormMessage error={state.error} success={state.success} />
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-50">
        <div>
          <label className="label" htmlFor="fulfillmentStatus">Status</label>
          <select id="fulfillmentStatus" name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className="field" data-testid="fulfillment-status-select">
            {(Object.keys(FULFILLMENT_LABEL) as FulfillmentStatusKey[]).map((k) => (
              <option key={k} value={k}>{FULFILLMENT_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="carrier">Transportadora</label>
            <input id="carrier" name="carrier" defaultValue={order.carrier ?? ""} placeholder="Correios, Jadlog…" className="field" data-testid="fulfillment-carrier-input" />
          </div>
          <div>
            <label className="label" htmlFor="trackingCode">Código de rastreio</label>
            <input id="trackingCode" name="trackingCode" defaultValue={order.trackingCode ?? ""} placeholder="AA123456789BR" className="field font-mono" data-testid="fulfillment-tracking-code-input" />
            <FieldError errors={e?.trackingCode} testId="fulfillment-tracking-code-error" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="trackingUrl">Link de rastreio (opcional)</label>
          <input id="trackingUrl" name="trackingUrl" type="url" defaultValue={order.trackingUrl ?? ""} placeholder="https://…" className="field font-mono text-xs" data-testid="fulfillment-tracking-url-input" />
          <FieldError errors={e?.trackingUrl} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-ink" data-testid="fulfillment-notify-checkbox" />
          Avisar o cliente por e-mail ao marcar como enviado{order.customerEmail ? "" : " (cliente sem e-mail)"}
        </label>
        <div className="flex justify-end">
          <SubmitButton testId="fulfillment-submit-button">Salvar entrega</SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
