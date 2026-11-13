import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { contrastText } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase } from "@/lib/paths";
import { MAINTENANCE_COOKIE, verifyMaintenanceAccess } from "@/lib/maintenance";
import { StoreProvider } from "@/components/store-context";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { AnalyticsScripts } from "@/components/analytics-scripts";

type Props = { children: React.ReactNode; params: { store: string } };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const store = await getStoreBySlug(params.store);
  return {
    title: store?.name ?? "Loja",
    description: store?.description ?? undefined,
    icons: store?.faviconUrl ? { icon: store.faviconUrl } : undefined,
  };
}

// Tema (cores + F4.4 tema/fonte via data-attribute) e contexto do carrinho. Header/rodapé ficam
// em (shop)/layout.tsx — o /checkout não passa por ali, então fica com um layout enxuto. F4.5:
// loja em construção bloqueia tudo aqui dentro (menos a própria tela de senha).
export default async function StoreLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  if (store.maintenanceMode && !verifyMaintenanceAccess(store.id, cookies().get(MAINTENANCE_COOKIE)?.value)) {
    return <MaintenanceGate storeSlug={store.slug} storeName={store.name} />;
  }

  const theme = {
    "--brand": store.primaryColor,
    "--brand-contrast": contrastText(store.primaryColor),
    "--accent": store.accentColor,
  } as React.CSSProperties;
  const base = getStoreBase(store.slug);

  return (
    <StoreProvider value={{ slug: store.slug, base }}>
      <div
        style={theme}
        className="flex min-h-screen flex-col"
        data-theme={store.theme.toLowerCase()}
        data-font={store.font.toLowerCase()}
      >
        {children}
      </div>
      <AnalyticsScripts gaId={store.gaId} gtmId={store.gtmId} metaPixelId={store.metaPixelId} tiktokPixelId={store.tiktokPixelId} />
      <CookieConsentBanner />
    </StoreProvider>
  );
}
