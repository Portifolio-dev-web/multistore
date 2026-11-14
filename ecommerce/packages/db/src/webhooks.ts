import crypto from "node:crypto";
import { prisma } from "./client";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5_000, 15_000];

/**
 * F6.8: entrega assinada (HMAC-SHA256 do corpo, no header `X-Webhook-Signature`) com novas
 * tentativas em processo (setTimeout) — não é uma fila durável: se o servidor reiniciar entre
 * tentativas, a retentativa pendente se perde (ver Decisões). Uma linha por TENTATIVA em
 * `WebhookDelivery` é o histórico de entregas.
 */
export async function dispatchWebhook(storeId: string, event: string, payload: Record<string, unknown>): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { storeId, active: true, events: { has: event } } });
  for (const endpoint of endpoints) {
    deliver(endpoint, event, payload, 1).catch((err) => console.error("[webhooks] falha ao entregar", endpoint.id, err));
  }
}

async function deliver(
  endpoint: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>,
  attempt: number,
): Promise<void> {
  const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
  const signature = crypto.createHmac("sha256", endpoint.secret).update(body).digest("hex");

  let status: "SUCCESS" | "FAILED" = "FAILED";
  let responseStatus: number | null = null;
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Event": event, "X-Webhook-Signature": signature },
      body,
    });
    responseStatus = res.status;
    if (res.ok) status = "SUCCESS";
  } catch {
    responseStatus = null;
  }

  await prisma.webhookDelivery.create({
    data: { webhookEndpointId: endpoint.id, event, status, attempt, responseStatus },
  });

  if (status === "FAILED" && attempt < MAX_ATTEMPTS) {
    const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1)!;
    setTimeout(() => {
      deliver(endpoint, event, payload, attempt + 1).catch((err) => console.error("[webhooks] falha na retentativa", endpoint.id, err));
    }, delay);
  }
}

export function newWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}
