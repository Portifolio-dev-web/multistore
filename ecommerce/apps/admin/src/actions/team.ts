"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { withinUserLimit } from "@repo/db/plans";
import { sendTeamAdded, sendTeamInvite } from "@repo/mail";
import { requireSession } from "@/lib/session";
import { createUserToken } from "@/lib/user-token";
import { formToObject, inviteSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

const ROLE_LABEL: Record<"OWNER" | "ADMIN" | "OPERADOR", string> = { OWNER: "Proprietário", ADMIN: "Administrador", OPERADOR: "Operador" };
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Hash que ninguém consegue produzir com `bcrypt.compare` — o convidado só ganha senha de verdade
// ao aceitar o convite em /accept-invite/[token]
const UNUSABLE_HASH = "!invite-pending!";

export async function inviteTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession("team");
  const parsed = inviteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, role } = parsed.data;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "Loja não encontrada." };

  const memberCount = await prisma.membership.count({ where: { storeId } });
  if (!withinUserLimit(store.plan, memberCount)) {
    return { error: "Limite de usuários do plano atual atingido. Faça upgrade em Cobrança para convidar mais gente." };
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const existing = await prisma.membership.findUnique({ where: { userId_storeId: { userId: user.id, storeId } } });
    if (existing) return { fieldErrors: { email: ["Esta pessoa já faz parte da equipe"] } };

    await prisma.membership.create({ data: { userId: user.id, storeId, role } });
    await sendTeamAdded(store, user.email, ROLE_LABEL[role], `${process.env.ADMIN_URL ?? "http://localhost:3001"}/login`);
  } else {
    user = await prisma.user.create({ data: { email, passwordHash: UNUSABLE_HASH } });
    await prisma.membership.create({ data: { userId: user.id, storeId, role } });
    const rawToken = await createUserToken(user.id, "TEAM_INVITE", INVITE_TTL_MS);
    await sendTeamInvite(store, user.email, ROLE_LABEL[role], `${process.env.ADMIN_URL ?? "http://localhost:3001"}/accept-invite/${rawToken}`);
  }

  revalidatePath("/team");
  return { success: "Convite enviado." };
}

/** OWNER não pode ser removido enquanto for o único — a loja sempre precisa de um responsável */
async function isLastOwner(storeId: string, membershipId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.role !== "OWNER") return false;
  const ownerCount = await prisma.membership.count({ where: { storeId, role: "OWNER" } });
  return ownerCount <= 1;
}

export async function removeMembership(membershipId: string): Promise<void> {
  const { storeId } = await requireSession("team");
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, storeId } });
  if (!membership) return;
  if (await isLastOwner(storeId, membershipId)) return;

  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/team");
}

export async function changeMembershipRole(membershipId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession("team");
  const role = formData.get("role");
  if (role !== "OWNER" && role !== "ADMIN" && role !== "OPERADOR") return { error: "Papel inválido." };

  const membership = await prisma.membership.findFirst({ where: { id: membershipId, storeId } });
  if (!membership) return { error: "Membro não encontrado." };
  if (role !== "OWNER" && (await isLastOwner(storeId, membershipId))) {
    return { error: "A loja precisa de ao menos um proprietário." };
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath("/team");
  return { success: "Papel atualizado." };
}
