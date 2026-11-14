"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import type { FormState } from "@/lib/form";

export type CreateApiKeyState = FormState & { rawKey?: string };

export async function createApiKey(_prev: CreateApiKeyState, formData: FormData): Promise<CreateApiKeyState> {
  const { storeId } = await requireSession("settings");
  const name = formData.get("name")?.toString().trim();
  if (!name || name.length < 2) return { fieldErrors: { name: ["Dê um nome pra essa chave"] } };

  const rawKey = `sk_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  await prisma.apiKey.create({ data: { storeId, name, keyHash, prefix: rawKey.slice(0, 10) } });

  revalidatePath("/developers");
  return { rawKey };
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  const { storeId } = await requireSession("settings");
  await prisma.apiKey.updateMany({ where: { id: apiKeyId, storeId }, data: { revokedAt: new Date() } });
  revalidatePath("/developers");
}
