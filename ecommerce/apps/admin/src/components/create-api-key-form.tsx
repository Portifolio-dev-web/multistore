"use client";

import { useFormState } from "react-dom";
import { createApiKey, type CreateApiKeyState } from "@/actions/api-keys";
import { FieldError, SubmitButton } from "./form-ui";

export function CreateApiKeyForm() {
  const [state, action] = useFormState<CreateApiKeyState, FormData>(createApiKey, {});
  return (
    <form action={action} className="card flex flex-wrap items-end gap-4 p-5" data-testid="create-api-key-form">
      <div className="min-w-[220px] flex-1">
        <label className="label" htmlFor="name">Nome da chave</label>
        <input id="name" name="name" placeholder="ex.: integração ERP" required className="field" data-testid="api-key-name-input" />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <SubmitButton pendingLabel="Gerando…" testId="create-api-key-button">Gerar chave</SubmitButton>
      {state.rawKey && (
        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="api-key-raw-value">
          Copie agora — não será mostrada de novo: <span className="break-all font-mono text-xs">{state.rawKey}</span>
        </div>
      )}
    </form>
  );
}
