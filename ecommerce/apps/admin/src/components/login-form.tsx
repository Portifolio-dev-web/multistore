"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { login } from "@/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, {});
  return (
    <form action={action} className="space-y-4" data-testid="login-form">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage error={state.error} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" data-testid="login-email-input" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" data-testid="login-password-input" />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="btn w-full" pendingLabel="Entrando…" testId="login-submit-button">Entrar</SubmitButton>
      <p className="text-center text-sm text-ink/60">
        Ainda não tem loja? <Link href="/register" className="font-semibold text-ink underline underline-offset-4" data-testid="go-to-register-link">Criar conta</Link>
      </p>
    </form>
  );
}
