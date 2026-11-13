import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";

export default async function CartUnsubscribePage({ params }: { params: { store: string; token: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  await prisma.abandonedCart.updateMany({
    where: { token: params.token, storeId: store.id },
    data: { unsubscribedAt: new Date() },
  });

  return (
    <div className="mx-auto max-w-sm px-5 py-20 text-center" data-testid="cart-unsubscribe-confirmation">
      <p className="text-ink/70">Você não vai mais receber lembretes de carrinho abandonado.</p>
    </div>
  );
}
