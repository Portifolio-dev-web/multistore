import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

// Usado pelo middleware para mapear domínios próprios -> loja
export async function GET(req: Request) {
  const host = new URL(req.url).searchParams.get("host")?.toLowerCase().trim();
  if (!host) return NextResponse.json({ error: "host obrigatório" }, { status: 400 });

  const candidates = host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`];
  // F6.5: a vitrine só responde por domínios com a posse comprovada (TXT verificado)
  const store = await prisma.store.findFirst({ where: { customDomain: { in: candidates }, domainStatus: "VERIFIED" }, select: { slug: true } });
  if (!store) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ slug: store.slug });
}
