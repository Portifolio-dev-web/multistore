import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { effectivePrice } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { CartRecovery } from "@/components/cart-recovery";
import type { CartItem } from "@/lib/cart-store";

type SavedItem = { variantId: string; variantLabel: string | null; quantity: number };

// F3.4: revalida tudo contra o banco de novo (estoque pode ter mudado desde o abandono) — nunca confia no snapshot salvo pro preço/estoque.
export default async function CartRecoveryPage({ params }: { params: { store: string; token: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const cart = await prisma.abandonedCart.findFirst({ where: { token: params.token, storeId: store.id, recoveredOrderId: null } });
  if (!cart) notFound();

  const saved = cart.items as unknown as SavedItem[];
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: saved.map((i) => i.variantId) }, product: { storeId: store.id, active: true } },
    include: { product: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const items: CartItem[] = saved.flatMap((s) => {
    const v = byId.get(s.variantId);
    if (!v || v.stock <= 0) return [];
    return [{
      variantId: v.id,
      productId: v.productId,
      variantLabel: s.variantLabel,
      name: v.product.name,
      priceInCents: effectivePrice(v, v.product),
      image: v.imageUrl ?? v.product.images[0] ?? null,
      stock: v.stock,
      quantity: Math.min(s.quantity, v.stock),
    }];
  });

  return <CartRecovery storeSlug={store.slug} items={items} />;
}
