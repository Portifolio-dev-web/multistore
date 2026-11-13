"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma, type Prisma } from "@repo/db";
import { defaultHomeSections, defaultPages } from "@repo/db/content";
import { createSession, deleteSession } from "@/lib/session";
import { formToObject, loginSchema, registerSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

// Hash fixo para igualar o tempo de resposta quando o e-mail não existe
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 12);

// Limite simples de tentativas por e-mail (em memória, por instância)
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function isLocked(email: string): boolean {
  const entry = attempts.get(email);
  return !!entry && entry.count >= MAX_ATTEMPTS && entry.until > Date.now();
}

function registerFailure(email: string): void {
  const entry = attempts.get(email);
  const count = entry && entry.until > Date.now() ? entry.count + 1 : 1;
  attempts.set(email, { count, until: Date.now() + LOCK_MS });
}

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, password } = parsed.data;

  if (isLocked(email)) return { error: "Muitas tentativas. Tente novamente em 15 minutos." };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    registerFailure(email);
    return { error: "E-mail ou senha inválidos." };
  }

  attempts.delete(email);
  await createSession({ userId: user.id, storeId: user.storeId, email: user.email });
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
  const store = await prisma.store.create({
    data: {
      name: storeName,
      slug: storeSlug,
      homeSections,
      homeSectionsDraft: homeSections,
      users: { create: { name, email, passwordHash: await bcrypt.hash(password, 12) } },
      pages: { create: defaultPages() },
    },
    include: { users: true },
  });

  const user = store.users[0];
  await createSession({ userId: user.id, storeId: store.id, email: user.email });
  redirect("/");
}

export async function logout(): Promise<void> {
  deleteSession();
  redirect("/login");
}
