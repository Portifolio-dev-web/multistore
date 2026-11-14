import { SignJWT, jwtVerify } from "jose";

// Edge-safe (usado pelo middleware): sem Prisma, sem next/headers
export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// F6.1: sessionVersion viaja no próprio token — se a senha mudar, User.sessionVersion sobe e todo
// token assinado com a versão antiga passa a ser rejeitado em requireSession(), mesmo antes de expirar
export type SessionPayload = { userId: string; storeId: string; email: string; sessionVersion: number };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET ausente ou muito curto (mín. 32 caracteres)");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.storeId !== "string" || typeof payload.sessionVersion !== "number") return null;
    return { userId: payload.userId, storeId: payload.storeId, email: String(payload.email), sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}
