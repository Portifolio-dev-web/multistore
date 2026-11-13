import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { CheckoutForm } from "@/components/checkout-form";

// F3.1: cliente logado entra no checkout com identificação e endereço já preenchidos
export default async function CheckoutPage({ params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const session = await getCustomerForStore(store.id);
  if (!session) return <CheckoutForm storeSlug={store.slug} />;

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: { addresses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!customer) return <CheckoutForm storeSlug={store.slug} />;

  const address = customer.addresses[0];
  return (
    <CheckoutForm
      storeSlug={store.slug}
      initialIdentification={{ email: customer.email, name: customer.name ?? "", phone: customer.phone ?? "", document: customer.document ?? "" }}
      initialAddress={
        address
          ? { zip: address.zip, street: address.street, number: address.number, complement: address.complement ?? "", district: address.district, city: address.city, state: address.state }
          : undefined
      }
    />
  );
}
