import crypto from "node:crypto";

// F4.5: cookie "comprovante de senha" assinado por HMAC — não é um boundary de segurança real
// (a loja em construção não esconde dado sensível), só evita pedir a senha de novo a cada página.
function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET ausente ou muito curto (mín. 32 caracteres)");
  return value;
}

export const MAINTENANCE_COOKIE = "maintenance_access";

export function signMaintenanceAccess(storeId: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(storeId).digest("hex");
  return `${storeId}.${sig}`;
}

export function verifyMaintenanceAccess(storeId: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [id, sig] = cookieValue.split(".");
  if (id !== storeId || !sig) return false;
  const expected = crypto.createHmac("sha256", secret()).update(storeId).digest("hex");
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
