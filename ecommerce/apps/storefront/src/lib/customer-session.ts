import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@repo/db";

// F3.1: sessão do cliente final (separada da sessão do lojista no admin, mesmo segredo AUTH_SECRET)
export const CUSTOMER_SESSION_COOKIE = "customer_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type CustomerSessionPayload = { customerId: string; storeId: string; email: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET ausente ou muito curto (mín. 32 caracteres)");
  return new TextEncoder().encode(secret);
}

export async function signCustomerSession(payload: CustomerSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyCustomerSession(token?: string): Promise<CustomerSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.customerId !== "string" || typeof payload.storeId !== "string") return null;
    return { customerId: payload.customerId, storeId: payload.storeId, email: String(payload.email) };
  } catch {
    return null;
  }
}

export async function createCustomerSession(payload: CustomerSessionPayload): Promise<void> {
  cookies().set(CUSTOMER_SESSION_COOKIE, await signCustomerSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function deleteCustomerSession(): void {
  cookies().delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  return verifyCustomerSession(cookies().get(CUSTOMER_SESSION_COOKIE)?.value);
}

/** Confere de novo no banco e que a sessão é da loja atual — impede ver pedido de outra loja com o mesmo cookie. */
export async function getCustomerForStore(storeId: string): Promise<CustomerSessionPayload | null> {
  const session = await getCustomerSession();
  if (!session || session.storeId !== storeId) return null;
  const customer = await prisma.customer.findUnique({ where: { id: session.customerId }, select: { storeId: true } });
  if (!customer || customer.storeId !== storeId) return null;
  return session;
}
