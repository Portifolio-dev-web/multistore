"use client";

import { SubmitButton } from "./form-ui";

type Props = {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
  testId?: string;
};

export function DeleteButton({
  action,
  confirmMessage = "Excluir este produto? Pedidos antigos serão mantidos.",
  label = "Excluir produto",
  testId = "delete-product-button",
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <SubmitButton className="btn-danger" pendingLabel="Excluindo…" testId={testId}>{label}</SubmitButton>
    </form>
  );
}
