import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { deletePromotion, updatePromotion } from "@/actions/promotions";
import { PageHeader } from "@/components/page-header";
import { PromotionForm } from "@/components/promotion-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditPromotionPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const [promotion, products] = await Promise.all([
    prisma.promotion.findFirst({ where: { id: params.id, storeId } }),
    prisma.product.findMany({ where: { storeId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!promotion) notFound();

  return (
    <>
      <Link href="/promotions" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-promotions-link">← promoções</Link>
      <PageHeader
        title={promotion.name}
        subtitle="Editar promoção"
        action={
          <DeleteButton
            action={deletePromotion.bind(null, promotion.id)}
            confirmMessage="Excluir esta promoção?"
            label="Excluir promoção"
            testId="delete-promotion-button"
          />
        }
      />
      <PromotionForm action={updatePromotion.bind(null, promotion.id)} promotion={promotion} products={products} submitLabel="Salvar alterações" />
    </>
  );
}
