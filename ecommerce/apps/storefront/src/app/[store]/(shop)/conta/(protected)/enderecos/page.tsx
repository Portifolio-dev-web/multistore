import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { AddressForm } from "@/components/address-form";
import { deleteCustomerAddress } from "@/actions/customer-addresses";

export default async function AccountAddressesPage({ params }: { params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  const session = await getCustomerForStore(store!.id);

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: session!.customerId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div data-testid="account-addresses">
      <h1 className="font-display text-2xl font-bold tracking-tight">Meus endereços</h1>
      {addresses.length === 0 && <p className="mt-4 text-sm text-ink/50">Nenhum endereço salvo ainda.</p>}
      <ul className="mt-4 space-y-3" data-testid="address-list">
        {addresses.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 text-sm">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-ink/60">
                {a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""} · {a.district} · {a.city}/{a.state} · {a.zip}
              </p>
            </div>
            <form action={deleteCustomerAddress.bind(null, params.store, a.id)}>
              <button type="submit" className="text-xs text-ink/40 hover:text-red-600" data-testid={`address-delete-${a.id}`}>Remover</button>
            </form>
          </li>
        ))}
      </ul>
      <AddressForm storeSlug={params.store} />
    </div>
  );
}
