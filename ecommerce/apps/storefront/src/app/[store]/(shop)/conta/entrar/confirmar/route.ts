import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { storeUrl } from "@repo/db/urls";
import { getStoreBySlug } from "@/lib/store";
import { createCustomerSession } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

// Monta a URL absoluta sempre a partir de `storeUrl()` (env), nunca de `req.url`: em modo
// subdomínio/domínio próprio, o host que o Route Handler enxerga nem sempre é o host externo
// de verdade (depende de como o Next propaga x-forwarded-host internamente).
export async function GET(req: Request, { params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) return NextResponse.redirect(`${storeUrl({ slug: params.store, customDomain: null })}/conta/entrar?erro=1`);

  const base = storeUrl(store);
  const failUrl = `${base}/conta/entrar?erro=1`;

  const rawToken = new URL(req.url).searchParams.get("token");
  if (!rawToken) return NextResponse.redirect(failUrl);
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const token = await prisma.customerLoginToken.findUnique({ where: { tokenHash }, include: { customer: true } });
  if (!token || token.usedAt || token.expiresAt < new Date() || token.customer.storeId !== store.id) {
    return NextResponse.redirect(failUrl);
  }

  await prisma.customerLoginToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  await createCustomerSession({ customerId: token.customer.id, storeId: store.id, email: token.customer.email });

  return NextResponse.redirect(`${base}/conta`);
}
