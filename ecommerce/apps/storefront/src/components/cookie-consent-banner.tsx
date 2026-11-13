"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/consent";

// F5.2: banner de consentimento (LGPD) — enquanto não decide, nenhum pixel de marketing carrega.
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  const decide = (accepted: boolean) => {
    setConsent(accepted ? "accepted" : "rejected");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-ink/10 bg-white p-4 shadow-xl sm:p-5" data-testid="cookie-consent-banner">
      <p className="text-sm text-ink/70">
        Usamos cookies para melhorar sua experiência e medir o desempenho da loja. Você pode aceitar ou recusar os cookies de marketing e análise.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => decide(false)} className="btn-ghost" data-testid="cookie-consent-reject">Recusar</button>
        <button type="button" onClick={() => decide(true)} className="btn-brand" data-testid="cookie-consent-accept">Aceitar</button>
      </div>
    </div>
  );
}
