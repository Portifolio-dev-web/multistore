"use client";

import { useState } from "react";
import { generateProductDescription } from "@/actions/ai-description";

export function AiDescriptionButton({ enabled }: { enabled: boolean }) {
  const [attributes, setAttributes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seo, setSeo] = useState<{ seoTitle: string; seoDescription: string } | null>(null);

  if (!enabled) return null;

  const generate = async () => {
    const name = (document.getElementById("name") as HTMLInputElement | null)?.value ?? "";
    setLoading(true);
    setError(null);
    setSeo(null);
    const result = await generateProductDescription({ name, attributes });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const textarea = document.getElementById("description") as HTMLTextAreaElement | null;
    if (textarea) textarea.value = result.description;
    setSeo({ seoTitle: result.seoTitle, seoDescription: result.seoDescription });
  };

  return (
    <div className="mt-2 rounded-lg border border-line bg-bone/60 p-3" data-testid="ai-description-box">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={attributes}
          onChange={(e) => setAttributes(e.target.value)}
          placeholder="Atributos (cor, material…) — opcional"
          className="field flex-1 text-sm"
          data-testid="ai-description-attributes-input"
        />
        <button type="button" onClick={generate} disabled={loading} className="btn-outline whitespace-nowrap" data-testid="ai-description-generate-button">
          {loading ? "Gerando…" : "Gerar com IA"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700" data-testid="ai-description-error">{error}</p>}
      {seo && (
        <div className="mt-2 space-y-1 text-xs text-ink/60" data-testid="ai-description-seo">
          <p>Preencheu a descrição. Sugestões para SEO (copie manualmente):</p>
          <p><strong>Título:</strong> {seo.seoTitle}</p>
          <p><strong>Meta descrição:</strong> {seo.seoDescription}</p>
        </div>
      )}
    </div>
  );
}
