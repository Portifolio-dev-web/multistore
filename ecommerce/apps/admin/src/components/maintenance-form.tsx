"use client";

import { useFormState } from "react-dom";
import { updateMaintenance } from "@/actions/settings";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function MaintenanceForm({ maintenanceMode, hasPassword }: { maintenanceMode: boolean; hasPassword: boolean }) {
  const [state, action] = useFormState(updateMaintenance, {});
  const e = state.fieldErrors;

  return (
    <form action={action} className="card space-y-4 p-6" data-testid="maintenance-form">
      <FormMessage error={state.error} success={state.success} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="maintenanceMode" defaultChecked={maintenanceMode} data-testid="maintenance-mode-checkbox" />
        Loja em construção (bloqueia visitantes com uma senha)
      </label>
      <div>
        <label className="label" htmlFor="password">{hasPassword ? "Nova senha (deixe em branco pra manter a atual)" : "Senha de acesso"}</label>
        <input id="password" name="password" type="text" className="field font-mono" data-testid="maintenance-password-input" />
        <FieldError errors={e?.password} testId="maintenance-password-error" />
      </div>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="maintenance-submit-button">Salvar</SubmitButton>
      </div>
    </form>
  );
}
