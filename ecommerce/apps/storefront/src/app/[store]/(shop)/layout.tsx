import Link from "next/link";
import { notFound } from "next/navigation";
import { parseNavigation, parseSocialLinks } from "@repo/db/content";
import { formatAddress } from "@repo/db/utils";
import { storeUrl } from "@repo/db/urls";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { CartBadge } from "@/components/cart-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import { NavMenu } from "@/components/nav-menu";
import { jsonLdScriptProps, organizationJsonLd } from "@/lib/seo";

type Props = { children: React.ReactNode; params: { store: string } };

const SOCIAL_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

// Header e rodapé da vitrine normal. Fica fora do /checkout de propósito (layout enxuto lá).
export default async function ShopLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();
  const base = getStoreBase(store.slug);
  const navItems = parseNavigation(store.navigation);
  const social = parseSocialLinks(store.socialLinks);
  const legalAddress = formatAddress(store.legalAddress);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script {...jsonLdScriptProps(organizationJsonLd(store, storeUrl(store)))} />
      {store.announcementBar && (
        <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-paper" data-testid="announcement-bar">
          {store.announcementBar}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
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
          <NavMenu base={base} items={navItems} />
          <form method="get" action={storeHref(base, "/busca")} className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs">
            <input
              name="q"
              placeholder="Buscar produtos…"
              className="field"
              data-testid="header-search-input"
            />
          </form>
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
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm sm:grid-cols-3 sm:px-8">
          <div>
            <span className="font-display text-base font-semibold">{store.name}</span>
            <p className="mt-2 opacity-70">Pagamento seguro via Stripe · Preços em R$</p>
            {Object.keys(social).length > 0 && (
              <div className="mt-4 flex gap-3" data-testid="footer-social-links">
                {Object.entries(social).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noreferrer" className="underline underline-offset-4 opacity-80 hover:opacity-100" data-testid={`footer-social-${platform}`}>
                    {SOCIAL_LABEL[platform] ?? platform}
                  </a>
                ))}
              </div>
            )}
          </div>
          {navItems.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.14em] opacity-60">Links</p>
              <ul className="mt-3 space-y-1.5">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.type === "category" ? storeHref(base, `/categorias/${item.value}`) : item.type === "page" ? storeHref(base, `/p/${item.value}`) : item.value}
                      className="opacity-80 hover:opacity-100"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(store.legalName || store.taxId || legalAddress.length > 0) && (
            <div className="text-xs leading-relaxed opacity-70" data-testid="footer-legal-info">
              {store.legalName && <p>{store.legalName}</p>}
              {store.taxId && <p>{store.taxId}</p>}
              {legalAddress.map((l) => <p key={l}>{l}</p>)}
            </div>
          )}
        </div>
      </footer>
      <WhatsappButton phone={store.whatsapp} storeName={store.name} />
    </>
  );
}
