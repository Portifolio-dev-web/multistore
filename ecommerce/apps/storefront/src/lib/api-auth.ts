import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

const RATE_LIMIT = 60; // requisições por minuto por chave
// ponytail: limite em memória (reseta a cada deploy/restart) — é proteção contra abuso, não um
// controle de segurança que precise sobreviver a reinício (diferente do LoginAttempt da F6.1)
const requestLog = new Map<string, number[]>();

function withinRateLimit(apiKeyId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (requestLog.get(apiKeyId) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT) {
    requestLog.set(apiKeyId, timestamps);
    return false;
  }
  timestamps.push(now);
  requestLog.set(apiKeyId, timestamps);
  return true;
}

export type ApiAuth = { storeId: string; apiKeyId: string };

/** F6.8: `Authorization: Bearer <chave>` — hash da chave é o que fica no banco */
export async function authenticateApiKey(req: Request): Promise<ApiAuth | NextResponse> {
  const header = req.headers.get("authorization");
  const rawKey = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!rawKey) return NextResponse.json({ error: "Token de API ausente (Authorization: Bearer <chave>)" }, { status: 401 });

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!key || key.revokedAt) return NextResponse.json({ error: "Token de API inválido ou revogado" }, { status: 401 });

  if (!withinRateLimit(key.id)) return NextResponse.json({ error: "Limite de requisições excedido (60/min)" }, { status: 429 });

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { storeId: key.storeId, apiKeyId: key.id };
}

export function isApiAuth(result: ApiAuth | NextResponse): result is ApiAuth {
  return !(result instanceof NextResponse);
}
