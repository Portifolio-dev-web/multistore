"use client";

// F5.2: consentimento de cookies (LGPD) — guardado no navegador, sem depender do servidor.
// Pixels de marketing só carregam depois do "accepted"; "rejected" nunca mais mostra o banner.
const KEY = "vitrine-cookie-consent";
export const CONSENT_EVENT = "vitrine-cookie-consent-change";

export type Consent = "accepted" | "rejected";

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    // localStorage indisponível (modo privado etc.) — o banner simplesmente volta a aparecer
  }
}
