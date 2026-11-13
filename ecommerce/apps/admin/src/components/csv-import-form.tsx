"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { parseImportCsv, type ImportParseResult } from "@/lib/product-csv";
import { importProductsCsv, type ImportState } from "@/actions/csv-import";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn" data-testid="csv-import-confirm-button">
      {pending ? "Importando…" : "Confirmar importação"}
    </button>
  );
}

export function CsvImportForm() {
  const [state, formAction] = useFormState<ImportState, FormData>(importProductsCsv, {});
  const [preview, setPreview] = useState<ImportParseResult | null>(null);
  const [csvText, setCsvText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setCsvText("");
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(parseImportCsv(text));
  };

  return (
    <div className="card max-w-2xl space-y-4 p-6" data-testid="csv-import-form">
      <div>
        <label className="label" htmlFor="csv-file">Arquivo CSV</label>
        <input
          ref={inputRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="field"
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid="csv-import-file-input"
        />
      </div>

      {preview && (
        <div data-testid="csv-import-preview">
          <p className="text-sm" data-testid="csv-import-preview-summary">
            {preview.rows.length} linha(s) válida(s) pra atualizar, {preview.errors.length} ignorada(s).
          </p>
          {preview.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-bone/60 p-3 text-xs text-ink/70" data-testid="csv-import-preview-errors">
              {preview.errors.map((e, i) => (
                <li key={i}>linha {e.line}{e.sku && ` (SKU ${e.sku})`}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="csvText" value={csvText} />
        <SubmitButton disabled={!preview || preview.rows.length === 0} />
      </form>

      {state.success && (
        <p className="rounded-lg border border-lime bg-lime/30 px-3 py-2 text-sm" data-testid="form-success">{state.success}</p>
      )}
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="form-error">{state.error}</p>
      )}
      {!!state.report?.length && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-bone/60 p-3 text-xs text-ink/70" data-testid="csv-import-report">
          {state.report.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
