import crypto from "node:crypto";
import { prisma, type UserTokenPurpose } from "@repo/db";

/** Mesmo padrão de CustomerLoginToken (storefront): token aleatório só existe em texto puro no
 * e-mail; o banco guarda só o hash. */
export async function createUserToken(userId: string, purpose: UserTokenPurpose, ttlMs: number): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.userToken.create({ data: { userId, purpose, tokenHash, expiresAt: new Date(Date.now() + ttlMs) } });
  return rawToken;
}

/** Token de uso único: já marca como usado aqui, mesmo que o chamador decida rejeitar depois. */
export async function consumeUserToken(rawToken: string, purpose: UserTokenPurpose) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const token = await prisma.userToken.findUnique({ where: { tokenHash } });
  if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt < new Date()) return null;
  await prisma.userToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token;
}
