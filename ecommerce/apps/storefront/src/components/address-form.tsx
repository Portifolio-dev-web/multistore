"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addCustomerAddress, type AddressFormState } from "@/actions/customer-addresses";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brand py-2.5" data-testid="address-submit-button">
      {pending ? "Salvando…" : "Adicionar endereço"}
    </button>
  );
}

export function AddressForm({ storeSlug }: { storeSlug: string }) {
  const action = addCustomerAddress.bind(null, storeSlug);
  const [state, formAction] = useFormState<AddressFormState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-6 space-y-3 rounded-3xl border border-ink/10 bg-white p-5" data-testid="address-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder="Nome (ex.: Casa)" required className="field" data-testid="address-name-input" />
        <input name="zip" placeholder="CEP" required className="field" data-testid="address-zip-input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="street" placeholder="Rua" required className="field sm:col-span-2" data-testid="address-street-input" />
        <input name="number" placeholder="Número" required className="field" data-testid="address-number-input" />
      </div>
      <input name="complement" placeholder="Complemento (opcional)" className="field" data-testid="address-complement-input" />
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="district" placeholder="Bairro" required className="field" data-testid="address-district-input" />
        <input name="city" placeholder="Cidade" required className="field" data-testid="address-city-input" />
        <input name="state" placeholder="UF" required maxLength={2} className="field" data-testid="address-state-input" />
      </div>
      {state.error && <p className="text-sm text-red-700" data-testid="address-form-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
