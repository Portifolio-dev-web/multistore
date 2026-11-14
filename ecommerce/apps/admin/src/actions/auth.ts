"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma, type Prisma } from "@repo/db";
import { defaultHomeSections, defaultPages } from "@repo/db/content";
import { sendEmailVerification, sendPasswordReset } from "@repo/mail";
import { createSession, deleteSession, getSession } from "@/lib/session";
import { createUserToken, consumeUserToken } from "@/lib/user-token";
import {
  acceptInviteSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  formToObject,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import type { FormState } from "@/lib/form";

// Hash fixo para igualar o tempo de resposta quando o e-mail não existe
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 12);

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function adminUrl(path: string): string {
  return `${process.env.ADMIN_URL ?? "http://localhost:3001"}${path}`;
}

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** F6.1: substitui o Map em memória por linhas em `LoginAttempt` — sobrevive a reinício/múltiplas instâncias */
async function isLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000);
  const count = await prisma.loginAttempt.count({ where: { email, createdAt: { gte: since } } });
  return count >= MAX_ATTEMPTS;
}

async function registerFailure(email: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { email } });
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, password } = parsed.data;

  if (await isLocked(email)) return { error: "Muitas tentativas. Tente novamente em 15 minutos." };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    await registerFailure(email);
    return { error: "E-mail ou senha inválidos." };
  }

  // F6.2: entra na loja mais antiga em que o usuário tem papel (primeira que teve acesso); o
  // seletor de loja no painel troca pra outra depois, se ele tiver mais de uma.
  const membership = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!membership) {
    await registerFailure(email);
    return { error: "Esta conta não tem acesso a nenhuma loja." };
  }

  await createSession({ userId: user.id, storeId: membership.storeId, email: user.email, sessionVersion: user.sessionVersion });
  redirect(safeNext(formData.get("next")?.toString()));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  if (process.env.ALLOW_REGISTRATION === "false") return { error: "Cadastro de novos lojistas desativado." };

  const parsed = registerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password, storeName, storeSlug } = parsed.data;

  const [emailTaken, slugTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true } }),
  ]);
  if (emailTaken) return { fieldErrors: { email: ["E-mail já cadastrado"] } };
  if (slugTaken) return { fieldErrors: { storeSlug: ["Endereço já em uso"] } };

  const homeSections = defaultHomeSections() as unknown as Prisma.InputJsonValue;
  const { user, store } = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: storeName,
        slug: storeSlug,
        homeSections,
        homeSectionsDraft: homeSections,
        pages: { create: defaultPages() },
      },
    });
    const user = await tx.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
    await tx.membership.create({ data: { userId: user.id, storeId: store.id, role: "OWNER" } });
    return { user, store };
  });

  await createSession({ userId: user.id, storeId: store.id, email: user.email, sessionVersion: user.sessionVersion });

  // F6.1: verificação de e-mail no cadastro — não bloqueia o login, só marca o status da conta
  const rawToken = await createUserToken(user.id, "EMAIL_VERIFY", VERIFY_TTL_MS);
  await sendEmailVerification(user.email, user.name, adminUrl(`/verify-email/${rawToken}`));

  redirect("/");
}

export async function logout(): Promise<void> {
  deleteSession();
  redirect("/login");
}

/** F6.2: troca a loja ativa da sessão (seletor no painel) — só se o usuário tiver Membership nela */
export async function switchStore(storeId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findUnique({ where: { userId_storeId: { userId: session.userId, storeId } } });
  if (!membership) return;

  await createSession({ ...session, storeId });
  redirect("/");
}

/** Sempre responde com sucesso — nunca revela se o e-mail existe ou não */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const rawToken = await createUserToken(user.id, "PASSWORD_RESET", RESET_TTL_MS);
    await sendPasswordReset(user.email, user.name, adminUrl(`/reset-password/${rawToken}`));
  }
  return { success: "Se o e-mail existir, enviamos um link para redefinir a senha." };
}

export async function resetPassword(rawToken: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const token = await consumeUserToken(rawToken, "PASSWORD_RESET");
  if (!token) return { error: "Link inválido ou expirado. Peça uma nova redefinição." };

  // F6.1: trocar a senha sobe sessionVersion — derruba qualquer outra sessão aberta (ver requireSession)
  const user = await prisma.user.update({
    where: { id: token.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), sessionVersion: { increment: 1 } },
  });

  const membership = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (membership) {
    await createSession({ userId: user.id, storeId: membership.storeId, email: user.email, sessionVersion: user.sessionVersion });
  }
  redirect("/");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const valid = user && (await bcrypt.compare(parsed.data.currentPassword, user.passwordHash));
  if (!user || !valid) return { fieldErrors: { currentPassword: ["Senha atual incorreta"] } };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } },
  });
  // Reemite a sessão deste navegador com a versão nova — só os outros dispositivos são derrubados
  await createSession({ ...session, sessionVersion: updated.sessionVersion });
  return { success: "Senha alterada. Todos os outros dispositivos foram desconectados." };
}

export async function resendVerificationEmail(): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.emailVerifiedAt) return {};

  const rawToken = await createUserToken(user.id, "EMAIL_VERIFY", VERIFY_TTL_MS);
  await sendEmailVerification(user.email, user.name, adminUrl(`/verify-email/${rawToken}`));
  return { success: "E-mail de verificação reenviado." };
}

export async function verifyEmail(rawToken: string): Promise<boolean> {
  const token = await consumeUserToken(rawToken, "EMAIL_VERIFY");
  if (!token) return false;
  await prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}

/** F6.2: convite cria o `User`/`Membership` na hora (ver actions/team.ts) — aceitar só define a
 * senha e comprova o e-mail, clicar no link já é a própria verificação. */
export async function acceptInvite(rawToken: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptInviteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const token = await consumeUserToken(rawToken, "TEAM_INVITE");
  if (!token) return { error: "Convite inválido ou expirado." };

  const user = await prisma.user.update({
    where: { id: token.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), emailVerifiedAt: new Date() },
  });
  const membership = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (!membership) return { error: "Convite não está mais vinculado a nenhuma loja." };

  await createSession({ userId: user.id, storeId: membership.storeId, email: user.email, sessionVersion: user.sessionVersion });
  redirect("/");
}
