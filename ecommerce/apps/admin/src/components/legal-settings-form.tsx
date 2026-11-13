"use client";

import { useFormState } from "react-dom";
import type { LegalAddress } from "@repo/db/content";
import { updateLegalSettings } from "@/actions/settings";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = { legalName: string | null; taxId: string | null; legalAddress: LegalAddress | null };

export function LegalSettingsForm({ legalName, taxId, legalAddress }: Props) {
  const [state, action] = useFormState(updateLegalSettings, {});
  const e = state.fieldErrors;

  return (
    <form action={action} className="card space-y-5 p-6" data-testid="legal-settings-form">
      <FormMessage error={state.error} success={state.success} />
      <p className="text-sm text-ink/60">
        Exigido pelo Decreto 7.962/2013 pra lojas online — aparece no rodapé da vitrine.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="legalName">Razão social</label>
          <input id="legalName" name="legalName" defaultValue={legalName ?? ""} className="field" data-testid="legal-name-input" />
          <FieldError errors={e?.legalName} />
        </div>
        <div>
          <label className="label" htmlFor="taxId">CNPJ ou CPF</label>
          <input id="taxId" name="taxId" defaultValue={taxId ?? ""} className="field font-mono" data-testid="legal-tax-id-input" />
          <FieldError errors={e?.taxId} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <input name="zip" defaultValue={legalAddress?.zip ?? ""} placeholder="CEP" className="field" data-testid="legal-zip-input" />
        <input name="street" defaultValue={legalAddress?.street ?? ""} placeholder="Rua" className="field sm:col-span-2" data-testid="legal-street-input" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <input name="number" defaultValue={legalAddress?.number ?? ""} placeholder="Número" className="field" data-testid="legal-number-input" />
        <input name="complement" defaultValue={legalAddress?.complement ?? ""} placeholder="Complemento" className="field" data-testid="legal-complement-input" />
        <input name="district" defaultValue={legalAddress?.district ?? ""} placeholder="Bairro" className="field" data-testid="legal-district-input" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <input name="city" defaultValue={legalAddress?.city ?? ""} placeholder="Cidade" className="field sm:col-span-2" data-testid="legal-city-input" />
        <input name="state" defaultValue={legalAddress?.state ?? ""} placeholder="UF" maxLength={2} className="field" data-testid="legal-state-input" />
      </div>
      {!legalName || !taxId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="legal-missing-warning">
          Sem razão social e CNPJ/CPF cadastrados, sua loja pode estar em desacordo com o Decreto 7.962/2013.
        </p>
      ) : null}
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="legal-submit-button">Salvar dados legais</SubmitButton>
      </div>
    </form>
  );
}
