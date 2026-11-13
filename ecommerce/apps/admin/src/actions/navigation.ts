"use server";

import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { navigationFormSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form";

export async function saveNavigation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession();
  const parsed = navigationFormSchema.safeParse({ navigationJson: formData.get("navigationJson") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.store.update({
    where: { id: storeId },
    data: { navigation: parsed.data.navigationJson as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/menu");
  revalidatePath("/", "layout");
  return { success: "Menu salvo." };
}
