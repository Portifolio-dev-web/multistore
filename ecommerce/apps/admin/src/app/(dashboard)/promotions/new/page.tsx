import Link from "next/link";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { createPromotion } from "@/actions/promotions";
import { PageHeader } from "@/components/page-header";
import { PromotionForm } from "@/components/promotion-form";

export default async function NewPromotionPage() {
  const { storeId } = await requireSession();
  const products = await prisma.product.findMany({ where: { storeId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <>
      <Link href="/promotions" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-promotions-link">← promoções</Link>
      <PageHeader title="Nova promoção" subtitle="Regra automática aplicada no carrinho e no checkout" />
      <PromotionForm action={createPromotion} products={products} submitLabel="Criar promoção" />
    </>
  );
}
