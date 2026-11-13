import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";

export default async function AccountOverviewPage({ params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  const session = await getCustomerForStore(store!.id);
  const customer = await prisma.customer.findUnique({ where: { id: session!.customerId } });

  return (
    <div data-testid="account-overview">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Olá, {customer?.name?.split(" ")[0] || customer?.email}
      </h1>
      <p className="mt-2 text-sm text-ink/60" data-testid="account-email">{customer?.email}</p>
    </div>
  );
}
