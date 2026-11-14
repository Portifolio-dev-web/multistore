"use server";

import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";

/** F6.11: registro de auditoria do banner — nunca identifica o visitante (ver schema.prisma) */
export async function logCookieConsent(storeSlug: string, decision: "ACCEPTED" | "REJECTED"): Promise<void> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return;
  await prisma.cookieConsentLog.create({ data: { storeId: store.id, decision } }).catch((err) => console.error("[cookie-consent-log]", err));
}
