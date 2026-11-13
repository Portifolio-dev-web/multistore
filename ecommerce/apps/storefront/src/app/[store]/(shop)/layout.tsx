import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { CartBadge } from "@/components/cart-badge";
import { WhatsappButton } from "@/components/whatsapp-button";

type Props = { children: React.ReactNode; params: { store: string } };

// Header e rodapé da vitrine normal. Fica fora do /checkout de propósito (layout enxuto lá).
export default async function ShopLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();
  const base = getStoreBase(store.slug);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href={storeHref(base)} className="flex items-center gap-3" data-testid="store-home-link">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logoUrl} alt={store.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-display text-sm font-bold text-brand-contrast">
                {store.name.slice(0, 1)}
              </span>
            )}
            <span className="font-display text-lg font-semibold tracking-tight">{store.name}</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href={storeHref(base, "/conta")} className="text-sm text-ink/60 hover:text-ink" data-testid="account-header-link">
              Minha conta
            </Link>
            <CartBadge />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-24 bg-brand text-brand-contrast">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-10 text-sm sm:flex-row sm:justify-between sm:px-8">
          <span className="font-display text-base font-semibold">{store.name}</span>
          <span className="opacity-70">Pagamento seguro via Stripe · Preços em R$</span>
        </div>
      </footer>
      <WhatsappButton phone={store.whatsapp} storeName={store.name} />
    </>
  );
}
