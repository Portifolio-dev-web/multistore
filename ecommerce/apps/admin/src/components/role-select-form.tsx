"use client";

import { useFormState } from "react-dom";
import type { Role } from "@repo/db";
import { changeMembershipRole } from "@/actions/team";

const ROLE_LABEL: Record<Role, string> = { OWNER: "Proprietário", ADMIN: "Administrador", OPERADOR: "Operador" };

export function RoleSelectForm({ membershipId, role }: { membershipId: string; role: Role }) {
  const [, action] = useFormState(changeMembershipRole.bind(null, membershipId), {});
  return (
    <form action={action}>
      <select
        name="role"
        defaultValue={role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field py-1.5 text-sm"
        data-testid={`member-role-select-${membershipId}`}
      >
        {Object.entries(ROLE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </form>
  );
}
