"use client";

import { useFormState } from "react-dom";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState> };

export function ResetPasswordForm({ action }: Props) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="space-y-4" data-testid="reset-password-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required className="field" data-testid="reset-password-input" />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="btn w-full" pendingLabel="Salvando…" testId="reset-password-submit-button">Redefinir senha</SubmitButton>
    </form>
  );
}
