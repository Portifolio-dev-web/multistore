"use client";

import { useFormState } from "react-dom";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState> };

export function AcceptInviteForm({ action }: Props) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="space-y-4" data-testid="accept-invite-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="password">Crie uma senha</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required className="field" data-testid="accept-invite-password-input" />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="btn w-full" pendingLabel="Entrando…" testId="accept-invite-submit-button">Aceitar convite</SubmitButton>
    </form>
  );
}
