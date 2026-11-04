import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { CheckoutForm } from "@/components/checkout-form";

export default async function CheckoutPage({ params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();
  return <CheckoutForm storeSlug={store.slug} />;
}
