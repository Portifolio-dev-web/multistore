import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { getStoreBase, storeHref } from "@/lib/paths";
import { logoutCustomer } from "@/actions/customer-auth";

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: { store: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();
  const base = getStoreBase(params.store);

  const session = await getCustomerForStore(store.id);
  if (!session) redirect(storeHref(base, "/conta/entrar"));

  const logout = logoutCustomer.bind(null, params.store);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <nav className="flex gap-5 text-sm font-medium text-ink/70" data-testid="account-nav">
          <Link href={storeHref(base, "/conta")} className="hover:text-ink" data-testid="account-nav-overview">Minha conta</Link>
          <Link href={storeHref(base, "/conta/pedidos")} className="hover:text-ink" data-testid="account-nav-orders">Pedidos</Link>
          <Link href={storeHref(base, "/conta/enderecos")} className="hover:text-ink" data-testid="account-nav-addresses">Endereços</Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="text-sm text-ink/50 hover:text-ink" data-testid="account-logout-button">Sair</button>
        </form>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
