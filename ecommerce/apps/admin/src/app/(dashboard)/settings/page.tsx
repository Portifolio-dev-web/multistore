import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { storeUrl } from "@repo/db/urls";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { DomainInfo } from "@/components/domain-info";

export default async function SettingsPage() {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) notFound();

  const root = process.env.STOREFRONT_ROOT_DOMAIN;
  const mainHost = new URL(process.env.STOREFRONT_URL!).host;

  return (
    <>
      <PageHeader title="Aparência e domínio" subtitle="Nome, endereço, logo, cores e domínio aplicados na vitrine." />
      <SettingsForm store={store} />
      <DomainInfo
        liveUrl={storeUrl(store)}
        subdomainUrl={root ? storeUrl({ slug: store.slug, customDomain: null }) : null}
        customDomain={store.customDomain}
        cnameTarget={root ?? mainHost}
      />
    </>
  );
}
