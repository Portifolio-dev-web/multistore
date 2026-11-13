"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { CEP, onlyDigits } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome para este endereço").max(80),
  zip: z.string().trim().regex(CEP, "CEP inválido").transform(onlyDigits),
  street: z.string().trim().min(2, "Informe a rua").max(120),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(60).optional().transform((v) => v || null),
  district: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.string().trim().length(2, "Use a sigla do estado").transform((v) => v.toUpperCase()),
});

export type AddressFormState = { error?: string };

export async function addCustomerAddress(storeSlug: string, _prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { error: "Loja não encontrada." };
  const session = await getCustomerForStore(store.id);
  if (!session) return { error: "Sessão expirada." };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  await prisma.customerAddress.create({ data: { customerId: session.customerId, ...parsed.data } });
  revalidatePath(`/${storeSlug}/conta/enderecos`);
  return {};
}

export async function deleteCustomerAddress(storeSlug: string, addressId: string): Promise<void> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return;
  const session = await getCustomerForStore(store.id);
  if (!session) return;
  await prisma.customerAddress.deleteMany({ where: { id: addressId, customerId: session.customerId } });
  revalidatePath(`/${storeSlug}/conta/enderecos`);
}
