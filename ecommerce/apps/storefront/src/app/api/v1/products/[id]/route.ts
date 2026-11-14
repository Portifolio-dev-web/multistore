import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/db";
import { authenticateApiKey, isApiAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function loadProduct(storeId: string, id: string) {
  return prisma.product.findFirst({ where: { id, storeId }, include: { variants: true } });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!isApiAuth(auth)) return auth;

  const product = await loadProduct(auth.storeId, params.id);
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceInCents: product.priceInCents,
      active: product.active,
      variants: product.variants.map((v) => ({ id: v.id, sku: v.sku, combination: v.combination, stock: v.stock, priceInCents: v.priceInCents })),
    },
  });
}

const updateStockSchema = z.object({ variantId: z.string().min(1), stock: z.number().int().min(0) });

/** F6.8: só atualiza estoque por aqui — preço/catálogo continuam só pelo painel */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!isApiAuth(auth)) return auth;

  const product = await loadProduct(auth.storeId, params.id);
  if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  const parsed = updateStockSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Corpo inválido. Esperado: { variantId, stock }" }, { status: 400 });

  const variant = product.variants.find((v) => v.id === parsed.data.variantId);
  if (!variant) return NextResponse.json({ error: "Variante não encontrada neste produto" }, { status: 404 });

  const updated = await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: parsed.data.stock } });
  return NextResponse.json({ data: { id: updated.id, stock: updated.stock } });
}
