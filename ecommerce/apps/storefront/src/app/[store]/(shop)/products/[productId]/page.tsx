import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";

type Props = { params: { store: string; productId: string } };

// URL antiga (F2.1): redireciona pro endereço amigável do produto
export default async function LegacyProductRedirect({ params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: store.id } });
  if (!product) notFound();

  permanentRedirect(storeHref(getStoreBase(store.slug), `/produtos/${product.slug}`));
}
