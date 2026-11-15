"use server";

import { redirect } from "next/navigation";
import { anonymizeCustomerData } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { deleteCustomerSession, getCustomerForStore } from "@/lib/customer-session";
import { getStoreBase, storeHref } from "@/lib/paths";

// LGPD art. 18 (eliminação): o próprio titular pede a exclusão — anonimiza (pedidos ficam por obrigação fiscal).
export async function deleteMyAccount(storeSlug: string): Promise<void> {
  const store = await getStoreBySlug(storeSlug);
  const session = store && (await getCustomerForStore(store.id));
  if (store && session) await anonymizeCustomerData(session.customerId, store.id);
  await deleteCustomerSession();
  redirect(storeHref(await getStoreBase(storeSlug)));
}
