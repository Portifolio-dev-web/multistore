"use client";

import { useFormState } from "react-dom";
import { createWebhookEndpoint } from "@/actions/webhooks";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

const EVENTS = [
  { value: "order.created", label: "Pedido criado" },
  { value: "order.paid", label: "Pedido pago" },
  { value: "product.updated", label: "Produto atualizado" },
];

export function CreateWebhookForm() {
  const [state, action] = useFormState(createWebhookEndpoint, {});
  return (
    <form action={action} className="card space-y-4 p-5" data-testid="create-webhook-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="url">URL do endpoint</label>
        <input id="url" name="url" type="url" placeholder="https://seu-sistema.com/webhooks/multistore" required className="field" data-testid="webhook-url-input" />
        <FieldError errors={state.fieldErrors?.url} />
      </div>
      <div>
        <span className="label">Eventos</span>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {EVENTS.map((e) => (
            <label key={e.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="events" value={e.value} className="h-4 w-4 accent-ink" data-testid={`webhook-event-${e.value}`} />
              {e.label}
            </label>
          ))}
        </div>
        <FieldError errors={state.fieldErrors?.events} />
      </div>
      <SubmitButton pendingLabel="Cadastrando…" testId="create-webhook-button">Cadastrar webhook</SubmitButton>
    </form>
  );
}
