"use client";

import { useFormState } from "react-dom";
import { inviteTeamMember } from "@/actions/team";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function InviteForm() {
  const [state, action] = useFormState(inviteTeamMember, {});
  return (
    <form action={action} className="card flex flex-wrap items-end gap-4 p-5" data-testid="invite-form">
      <div className="min-w-[220px] flex-1">
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="field" data-testid="invite-email-input" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div>
        <label className="label" htmlFor="role">Papel</label>
        <select id="role" name="role" defaultValue="OPERADOR" className="field" data-testid="invite-role-select">
          <option value="ADMIN">Administrador</option>
          <option value="OPERADOR">Operador</option>
        </select>
      </div>
      <SubmitButton pendingLabel="Convidando…" testId="invite-submit-button">Convidar</SubmitButton>
      <div className="w-full"><FormMessage error={state.error} success={state.success} /></div>
    </form>
  );
}
