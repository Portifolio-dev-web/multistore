import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, type Role } from "@repo/db";
import { hasPermission, type Permission } from "@repo/db/permissions";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./jwt";

export async function createSession(payload: SessionPayload): Promise<void> {
  cookies().set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function deleteSession(): void {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * Defesa em profundidade: toda Server Action/página revalida a sessão no banco.
 * F6.1: `sessionVersion` do token precisa bater com o do usuário (senão foi invalidado por uma
 * troca de senha em outro dispositivo). F6.2: `storeId` agora é validado contra `Membership`, não
 * contra `User.storeId` — o retorno continua `{ userId, storeId, email, ... }`, então as chamadas
 * existentes que só liam `{ storeId }` continuam funcionando sem mudança.
 */
export async function requireSession(permission?: Permission): Promise<SessionPayload & { role: Role }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { sessionVersion: true } });
  if (!user || user.sessionVersion !== session.sessionVersion) redirect("/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_storeId: { userId: session.userId, storeId: session.storeId } },
    select: { role: true },
  });
  if (!membership) redirect("/login");
  if (permission && !hasPermission(membership.role, permission)) redirect("/");

  return { ...session, role: membership.role };
}
