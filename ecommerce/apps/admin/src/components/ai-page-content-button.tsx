"use client";

import { useState, useTransition } from "react";
import { generatePageContent } from "@/actions/ai-description";

export function AiPageContentButton({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!enabled) return null;

  const click = () => {
    const title = (document.getElementById("title") as HTMLInputElement | null)?.value ?? "";
    const content = document.getElementById("content") as HTMLTextAreaElement | null;
    if (!content) return;
    setError(null);
    startTransition(async () => {
      const result = await generatePageContent(title);
      if ("error" in result) setError(result.error);
      else content.value = result.content;
    });
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={click} disabled={pending} className="btn-outline text-sm" data-testid="ai-page-content-button">
        {pending ? "Gerando…" : "✨ Gerar com IA"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700" data-testid="ai-page-content-error">{error}</p>}
    </div>
  );
}
