"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dispatchWebhook, isSafeWebhookUrl, newWebhookSecret, prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { formToObject } from "@/lib/validation";
import type { FormState } from "@/lib/form";

const EVENTS = ["order.created", "order.paid", "product.updated"] as const;

const webhookSchema = z.object({
  url: z.string().trim().url("URL inválida"),
  events: z.array(z.enum(EVENTS)).min(1, "Escolha ao menos um evento"),
});

export async function createWebhookEndpoint(_prev: FormState, formData: FormData): Promise<FormState> {
  const { storeId } = await requireSession("settings");
  const parsed = webhookSchema.safeParse({ ...formToObject(formData), events: formData.getAll("events") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!(await isSafeWebhookUrl(parsed.data.url))) {
    return { fieldErrors: { url: ["URL aponta para um host privado/interno — não permitido"] } };
  }

  await prisma.webhookEndpoint.create({
    data: { storeId, url: parsed.data.url, events: parsed.data.events, secret: newWebhookSecret() },
  });
  revalidatePath("/developers");
  return { success: "Webhook cadastrado." };
}

export async function deleteWebhookEndpoint(webhookEndpointId: string): Promise<void> {
  const { storeId } = await requireSession("settings");
  await prisma.webhookEndpoint.deleteMany({ where: { id: webhookEndpointId, storeId } });
  revalidatePath("/developers");
}

export async function sendTestWebhook(webhookEndpointId: string): Promise<void> {
  const { storeId } = await requireSession("settings");
  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: webhookEndpointId, storeId } });
  if (!endpoint) return;
  await dispatchWebhook(storeId, endpoint.events[0] ?? "order.created", { test: true, message: "Evento de teste do MultiStore" });
  revalidatePath("/developers");
}
