"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { parseBRLToCents } from "@repo/db/utils";
import type { FormState } from "@/lib/form";
import { FormMessage, SubmitButton } from "./form-ui";

export type VariantRow = {
  id: string;
  label: string | null;
  sku: string;
  priceInCents: string; // texto em BRL, vazio = herda do produto
  compareAtPriceInCents: string;
  stock: string;
};

function serialize(rows: VariantRow[]) {
  return rows.map((r) => ({
    id: r.id,
    sku: r.sku.trim() || null,
    priceInCents: r.priceInCents.trim() ? parseBRLToCents(r.priceInCents) : null,
    compareAtPriceInCents: r.compareAtPriceInCents.trim() ? parseBRLToCents(r.compareAtPriceInCents) : null,
    stock: Number(r.stock) || 0,
  }));
}

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: VariantRow[];
};

export function VariantsGrid({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  const update = (id: string, patch: Partial<VariantRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const applyStockToAll = () => setRows((r) => r.map((row) => ({ ...row, stock: bulkStock })));
  const applyPriceToAll = () => setRows((r) => r.map((row) => ({ ...row, priceInCents: bulkPrice })));

  return (
    <form action={formAction} data-testid="variants-grid">
      <FormMessage error={state.error} success={state.success} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(serialize(rows))} />
      {rows.length > 1 && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-bone/60 p-3">
          <div>
            <label className="label">Estoque pra todas</label>
            <div className="flex gap-2">
              <input value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} type="number" min={0} className="field w-28 font-mono" data-testid="bulk-stock-input" />
              <button type="button" onClick={applyStockToAll} className="btn-outline" data-testid="bulk-stock-apply-button">Aplicar a todas</button>
            </div>
          </div>
          <div>
            <label className="label">Preço pra todas (R$)</label>
            <div className="flex gap-2">
              <input value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="129,90" className="field w-28 font-mono" data-testid="bulk-price-input" />
              <button type="button" onClick={applyPriceToAll} className="btn-outline" data-testid="bulk-price-apply-button">Aplicar a todas</button>
            </div>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Variação</th>
              <th className="th">SKU</th>
              <th className="th">Preço (R$)</th>
              <th className="th">Preço &quot;de&quot;</th>
              <th className="th">Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} data-testid={`variant-row-${row.id}`}>
                <td className="td font-medium">{row.label ?? "Padrão"}</td>
                <td className="td">
                  <input value={row.sku} onChange={(e) => update(row.id, { sku: e.target.value })} className="field font-mono text-sm" data-testid={`variant-sku-input-${row.id}`} />
                </td>
                <td className="td">
                  <input
                    value={row.priceInCents}
                    onChange={(e) => update(row.id, { priceInCents: e.target.value })}
                    placeholder="herda do produto"
                    className="field font-mono text-sm"
                    data-testid={`variant-price-input-${row.id}`}
                  />
                </td>
                <td className="td">
                  <input
                    value={row.compareAtPriceInCents}
                    onChange={(e) => update(row.id, { compareAtPriceInCents: e.target.value })}
                    placeholder="opcional"
                    className="field font-mono text-sm"
                    data-testid={`variant-compare-price-input-${row.id}`}
                  />
                </td>
                <td className="td">
                  <input
                    value={row.stock}
                    onChange={(e) => update(row.id, { stock: e.target.value })}
                    type="number"
                    min={0}
                    className="field font-mono text-sm"
                    data-testid={`variant-stock-input-${row.id}`}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-10 text-center text-ink/50">Salve as opções acima pra gerar a grade.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end">
        <SubmitButton testId="variants-submit-button">Salvar variações</SubmitButton>
      </div>
    </form>
  );
}

