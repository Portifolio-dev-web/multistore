"use client";

import { useFormState } from "react-dom";
import { verifyDomain } from "@/actions/settings";
import { FormMessage, SubmitButton } from "./form-ui";

export function VerifyDomainButton() {
  const [state, action] = useFormState(verifyDomain, {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton className="btn-outline" pendingLabel="Verificando…" testId="verify-domain-button">Verificar agora</SubmitButton>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
