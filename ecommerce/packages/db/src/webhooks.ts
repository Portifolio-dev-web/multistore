import crypto from "node:crypto";
import dns from "node:dns";
import { isIP } from "node:net";
import { prisma } from "./client";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5_000, 15_000];

/** IPv4/IPv6 privados, loopback, link-local (inclui metadata 169.254.169.254) e reservados. */
function isPrivateOrReservedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (isIP(ip) === 6) {
    const norm = ip.toLowerCase();
    return norm === "::1" || norm === "::" || norm.startsWith("fe80:") || norm.startsWith("fc") || norm.startsWith("fd") || norm.startsWith("::ffff:127.");
  }
  return true; // não reconhecido como IP válido — trata como inseguro
}

/**
 * F6.8 (SSRF): só permite webhook para host público. Resolve o DNS e recusa qualquer endereço
 * privado/loopback/link-local/metadata — chamado tanto na validação do cadastro quanto
 * de novo bem antes de cada fetch em deliver() (reduz a janela de DNS rebinding/TOCTOU).
 */
export async function isSafeWebhookUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hostname === "localhost") return false;

  try {
    const addresses = await dns.promises.lookup(url.hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateOrReservedIp(a.address));
  } catch {
    return false;
  }
}

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
    if (!(await isSafeWebhookUrl(endpoint.url))) throw new Error("URL do webhook não é mais segura (host privado/interno)");
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Event": event, "X-Webhook-Signature": signature },
      body,
      redirect: "manual", // nunca segue redirect — evita contornar a checagem de SSRF via 302 pra host interno
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
