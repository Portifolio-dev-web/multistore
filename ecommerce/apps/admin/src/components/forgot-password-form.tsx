"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordReset } from "@/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function ForgotPasswordForm() {
  const [state, action] = useFormState(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-4" data-testid="forgot-password-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" data-testid="forgot-password-email-input" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <SubmitButton className="btn w-full" pendingLabel="Enviando…" testId="forgot-password-submit-button">Enviar link</SubmitButton>
      <p className="text-center text-sm text-ink/60">
        <Link href="/login" className="underline underline-offset-4" data-testid="back-to-login-link">Voltar ao login</Link>
      </p>
    </form>
  );
}
