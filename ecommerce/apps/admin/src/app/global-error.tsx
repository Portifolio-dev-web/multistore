"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/error-reporting";

// F6.10: Next.js chama este arquivo quando um erro não tratado escapa de toda a árvore de rotas
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    captureError(error, { source: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="grid min-h-screen place-items-center bg-bone p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-ink/60">O erro já foi registrado. Tente recarregar a página.</p>
        </div>
      </body>
    </html>
  );
}
