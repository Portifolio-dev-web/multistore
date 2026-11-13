import Link from "next/link";
import { createCoupon } from "@/actions/coupons";
import { PageHeader } from "@/components/page-header";
import { CouponForm } from "@/components/coupon-form";

export default function NewCouponPage() {
  return (
    <>
      <Link href="/coupons" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-coupons-link">← cupons</Link>
      <PageHeader title="Novo cupom" subtitle="Crie um código de desconto para a loja" />
      <CouponForm action={createCoupon} submitLabel="Criar cupom" />
    </>
  );
}
