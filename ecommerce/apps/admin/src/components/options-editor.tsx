"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/form";
import { FormMessage, SubmitButton } from "./form-ui";

export type OptionRow = { name: string; valuesText: string };

const MAX_OPTIONS = 3;

function serialize(rows: OptionRow[]) {
  return rows
    .map((r) => ({ name: r.name.trim(), values: r.valuesText.split(",").map((v) => v.trim()).filter(Boolean) }))
    .filter((r) => r.name && r.values.length > 0);
}

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: OptionRow[];
};

export function OptionsEditor({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [rows, setRows] = useState<OptionRow[]>(initial.length > 0 ? initial : [{ name: "", valuesText: "" }]);
  const router = useRouter();
  // Salvar aqui recalcula a grade de variações abaixo, que é renderizada pelo Server Component
  // da página — sem isso ela ficaria com os dados de antes do salvamento.
  useEffect(() => {
    if (state.success) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const update = (i: number, patch: Partial<OptionRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const add = () => setRows((r) => [...r, { name: "", valuesText: "" }]);

  return (
    <form action={formAction} data-testid="options-editor">
      <FormMessage error={state.error} success={state.success} />
      <input type="hidden" name="optionsJson" value={JSON.stringify(serialize(rows))} />
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-3" data-testid={`option-row-${i}`}>
            <input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Nome (ex.: Cor)"
              className="field w-40"
              data-testid={`option-name-input-${i}`}
            />
            <input
              value={row.valuesText}
              onChange={(e) => update(i, { valuesText: e.target.value })}
              placeholder="Valores separados por vírgula (ex.: Azul, Verde)"
              className="field flex-1"
              data-testid={`option-values-input-${i}`}
            />
            <button type="button" onClick={() => remove(i)} className="btn-ghost" data-testid={`option-remove-button-${i}`}>Remover</button>
          </div>
        ))}
      </div>
      {rows.length < MAX_OPTIONS && (
        <button type="button" onClick={add} className="btn-outline mt-3" data-testid="option-add-button">+ Adicionar opção</button>
      )}
      <p className="mt-2 text-xs text-ink/50">Até {MAX_OPTIONS} opções. Salvar recalcula a grade de variações abaixo.</p>
      <div className="mt-5 flex justify-end border-t border-line pt-5">
        <SubmitButton testId="options-submit-button">Salvar opções</SubmitButton>
      </div>
    </form>
  );
}
