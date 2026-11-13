"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { MAINTENANCE_COOKIE, signMaintenanceAccess } from "@/lib/maintenance";

export type MaintenanceLoginState = { error?: string };

export async function enterMaintenancePassword(storeSlug: string, _prev: MaintenanceLoginState, formData: FormData): Promise<MaintenanceLoginState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { error: "Loja não encontrada." };

  const password = String(formData.get("password") ?? "");
  const storeWithHash = await prisma.store.findUnique({ where: { id: store.id }, select: { maintenancePasswordHash: true } });
  const valid = storeWithHash?.maintenancePasswordHash && (await bcrypt.compare(password, storeWithHash.maintenancePasswordHash));
  if (!valid) return { error: "Senha incorreta." };

  cookies().set(MAINTENANCE_COOKIE, signMaintenanceAccess(store.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return {};
}
