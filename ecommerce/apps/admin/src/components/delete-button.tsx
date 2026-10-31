"use client";

import { SubmitButton } from "./form-ui";

export function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Excluir este produto? Pedidos antigos serão mantidos.")) e.preventDefault();
      }}
    >
      <SubmitButton className="btn-danger" pendingLabel="Excluindo…" testId="delete-product-button">Excluir produto</SubmitButton>
    </form>
  );
}
