"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/error-reporting";

// Erro numa tela do painel: mantém a sidebar e oferece tentar de novo.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { source: "dashboard-error", digest: error.digest });
  }, [error]);

  return (
    <div className="card p-10 text-center" data-testid="dashboard-error">
      <h1 className="text-xl font-semibold">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-sm text-ink/60">O erro foi registrado. Tente de novo; se continuar, recarregue a página.</p>
      <button type="button" onClick={reset} className="btn mt-6" data-testid="dashboard-error-retry">
        Tentar de novo
      </button>
    </div>
  );
}
