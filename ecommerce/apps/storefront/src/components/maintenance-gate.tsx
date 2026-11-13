"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enterMaintenancePassword } from "@/actions/maintenance";

export function MaintenanceGate({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await enterMaintenancePassword(storeSlug, {}, formData);
      if (result.error) setError(result.error);
      else router.refresh(); // cookie já setado no servidor — só falta o layout reler
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">{storeName}</h1>
      <p className="mt-2 text-sm text-ink/60">Esta loja está em construção. Informe a senha de acesso.</p>
      <form action={submit} className="mt-6 space-y-3">
        <input type="password" name="password" required className="field" placeholder="Senha" data-testid="maintenance-gate-password-input" />
        {error && <p className="text-sm text-red-700" data-testid="maintenance-gate-error">{error}</p>}
        <button type="submit" disabled={pending} className="btn-brand w-full py-3" data-testid="maintenance-gate-submit">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
