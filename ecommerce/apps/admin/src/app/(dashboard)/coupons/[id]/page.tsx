import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { deleteCoupon, updateCoupon } from "@/actions/coupons";
import { PageHeader } from "@/components/page-header";
import { CouponForm } from "@/components/coupon-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditCouponPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const coupon = await prisma.coupon.findFirst({ where: { id: params.id, storeId } });
  if (!coupon) notFound();

  return (
    <>
      <Link href="/coupons" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-coupons-link">← cupons</Link>
      <PageHeader
        title={coupon.code}
        subtitle="Editar cupom"
        action={
          <DeleteButton
            action={deleteCoupon.bind(null, coupon.id)}
            confirmMessage="Excluir este cupom? Pedidos que já usaram continuam com o desconto registrado."
            label="Excluir cupom"
            testId="delete-coupon-button"
          />
        }
      />
      <CouponForm action={updateCoupon.bind(null, coupon.id)} coupon={coupon} submitLabel="Salvar alterações" />
    </>
  );
}
