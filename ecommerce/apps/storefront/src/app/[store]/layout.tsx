import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contrastText } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { CartBadge } from "@/components/cart-badge";
import { StoreProvider } from "@/components/store-context";

type Props = { children: React.ReactNode; params: { store: string } };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const store = await getStoreBySlug(params.store);
  return { title: store?.name ?? "Loja", description: store?.description ?? undefined };
}

export default async function StoreLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const theme = {
    "--brand": store.primaryColor,
    "--brand-contrast": contrastText(store.primaryColor),
    "--accent": store.accentColor,
  } as React.CSSProperties;
  const base = getStoreBase(store.slug);

  return (
    <StoreProvider value={{ slug: store.slug, base }}>
    <div style={theme} className="flex min-h-screen flex-col">
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
          <CartBadge />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-24 bg-brand text-brand-contrast">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-10 text-sm sm:flex-row sm:justify-between sm:px-8">
          <span className="font-display text-base font-semibold">{store.name}</span>
          <span className="opacity-70">Pagamento seguro via Stripe · Preços em R$</span>
        </div>
      </footer>
    </div>
    </StoreProvider>
  );
}
