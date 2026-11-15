"use client";

import { useActionState } from "react";
import { verifyDomain } from "@/actions/settings";
import { FormMessage, SubmitButton } from "./form-ui";

export function VerifyDomainButton() {
  const [state, action] = useActionState(verifyDomain, {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton className="btn-outline" pendingLabel="Verificando…" testId="verify-domain-button">Verificar agora</SubmitButton>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
