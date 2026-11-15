"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/error-reporting";

// Erro numa página da loja: mantém o layout (tema, cabeçalho) e oferece tentar de novo.
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { source: "store-error", digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center sm:px-8" data-testid="store-error">
      <h1 className="font-display text-3xl font-bold tracking-tight">Algo deu errado</h1>
      <p className="mt-3 text-ink/60">Não conseguimos carregar esta página agora. Tente de novo em instantes.</p>
      <button type="button" onClick={reset} className="btn-brand mt-8" data-testid="store-error-retry">
        Tentar de novo
      </button>
    </div>
  );
}
