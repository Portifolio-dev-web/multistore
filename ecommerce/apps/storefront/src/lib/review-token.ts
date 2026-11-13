import crypto from "node:crypto";

// F3.6: liga o e-mail de "peça avaliação" a um pedido+produto sem precisar de tabela nova —
// assinatura HMAC com o mesmo segredo da sessão (AUTH_SECRET), sem expiração (pedido entregue já é prova).
function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET ausente ou muito curto (mín. 32 caracteres)");
  return value;
}

export function signReviewToken(orderId: string, productId: string): string {
  return crypto.createHmac("sha256", secret()).update(`${orderId}:${productId}`).digest("hex");
}

export function verifyReviewToken(orderId: string, productId: string, token: string): boolean {
  const expected = signReviewToken(orderId, productId);
  return expected.length === token.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
