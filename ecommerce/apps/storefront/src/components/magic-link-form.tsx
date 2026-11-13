"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestMagicLink, type MagicLinkState } from "@/actions/customer-auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brand w-full py-3" data-testid="magic-link-submit-button">
      {pending ? "Enviando…" : "Enviar link de acesso"}
    </button>
  );
}

export function MagicLinkForm({ storeSlug }: { storeSlug: string }) {
  const action = requestMagicLink.bind(null, storeSlug);
  const [state, formAction] = useFormState<MagicLinkState, FormData>(action, {});

  if (state.sent) {
    return (
      <p className="rounded-2xl bg-ink/5 p-5 text-sm" data-testid="magic-link-sent">
        Enviamos um link de acesso para o seu e-mail. Ele expira em 15 minutos.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" data-testid="magic-link-form">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="field" data-testid="magic-link-email-input" />
      </div>
      {state.error && (
        <p className="text-sm text-red-700" data-testid="magic-link-error">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
