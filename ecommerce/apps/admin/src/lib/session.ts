import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
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

/** Defesa em profundidade: toda Server Action/página revalida a sessão no banco */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { storeId: true } });
  if (!user || user.storeId !== session.storeId) redirect("/login");
  return session;
}
