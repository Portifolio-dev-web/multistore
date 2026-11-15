"use server";

import { revalidatePath } from "next/cache";
import { anonymizeCustomerData } from "@repo/db";
import { requireSession } from "@/lib/session";

/** F6.11 (LGPD): anonimização a pedido do titular, feita pelo lojista — regra em @repo/db/customers. */
export async function anonymizeCustomer(customerId: string): Promise<void> {
  const { storeId } = await requireSession();
  await anonymizeCustomerData(customerId, storeId);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}
