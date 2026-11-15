import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

// Retenção (LGPD + cota do banco): apaga tentativas, tokens, carrinhos e logs que já não servem.
// Mesmo agendador externo dos outros /api/cron/* — 1x por dia basta.
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [rateLimitHits, loginAttempts, customerTokens, userTokens, abandonedCarts, webhookDeliveries, aiGenerations, consentLogs] =
    await Promise.all([
      prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: daysAgo(1) } } }),
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: daysAgo(30) } } }),
      prisma.customerLoginToken.deleteMany({ where: { expiresAt: { lt: daysAgo(1) } } }),
      prisma.userToken.deleteMany({ where: { expiresAt: { lt: daysAgo(1) } } }),
      prisma.abandonedCart.deleteMany({ where: { createdAt: { lt: daysAgo(90) } } }),
      prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: daysAgo(30) } } }),
      prisma.aiGeneration.deleteMany({ where: { createdAt: { lt: daysAgo(30) } } }),
      prisma.cookieConsentLog.deleteMany({ where: { createdAt: { lt: daysAgo(365) } } }),
    ]);

  return NextResponse.json({
    rateLimitHits: rateLimitHits.count,
    loginAttempts: loginAttempts.count,
    customerTokens: customerTokens.count,
    userTokens: userTokens.count,
    abandonedCarts: abandonedCarts.count,
    webhookDeliveries: webhookDeliveries.count,
    aiGenerations: aiGenerations.count,
    consentLogs: consentLogs.count,
  });
}
