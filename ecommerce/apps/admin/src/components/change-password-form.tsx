"use client";

import { useFormState } from "react-dom";
import { changePassword } from "@/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePassword, {});
  return (
    <form action={action} className="card max-w-md space-y-4 p-6" data-testid="change-password-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="currentPassword">Senha atual</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="field" data-testid="current-password-input" />
        <FieldError errors={state.fieldErrors?.currentPassword} />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">Nova senha</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required className="field" data-testid="new-password-input" />
        <FieldError errors={state.fieldErrors?.newPassword} />
      </div>
      <SubmitButton pendingLabel="Salvando…" testId="change-password-submit-button">Alterar senha</SubmitButton>
    </form>
  );
}
