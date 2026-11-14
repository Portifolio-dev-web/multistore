"use client";

import type { FormState } from "@/lib/form";
import { SubmitButton } from "./form-ui";

export function ResendVerificationButton({ action }: { action: () => Promise<FormState> }) {
  return (
    <form action={async () => { await action(); }}>
      <SubmitButton className="btn-outline" pendingLabel="Enviando…" testId="resend-verification-button">Reenviar e-mail</SubmitButton>
    </form>
  );
}
