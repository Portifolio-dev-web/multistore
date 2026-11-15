import { prisma } from "./client";

/**
 * Janela deslizante no banco (mesmo padrão do LoginAttempt): sobrevive a reinício e a várias
 * instâncias. Registra a tentativa e devolve false se `key` já passou de `limit` na janela.
 * ponytail: count + create não é atômico — rajadas simultâneas podem passar 1-2 do limite; ok pra anti-abuso.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) return false;
  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

/** IP do cliente atrás do proxy da hospedagem (Fly-Client-IP no Fly.io; X-Real-IP/X-Forwarded-For nos demais). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("fly-client-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
