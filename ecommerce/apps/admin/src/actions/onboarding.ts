"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";

export async function dismissOnboarding(): Promise<void> {
  const { storeId } = await requireSession();
  await prisma.store.update({ where: { id: storeId }, data: { onboardingDismissedAt: new Date() } });
  revalidatePath("/");
}
