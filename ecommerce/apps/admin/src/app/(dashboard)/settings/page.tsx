import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { parseLegalAddress } from "@repo/db/content";
import { storeUrl } from "@repo/db/urls";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { DomainInfo } from "@/components/domain-info";
import { LegalSettingsForm } from "@/components/legal-settings-form";
import { MaintenanceForm } from "@/components/maintenance-form";

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
        domainStatus={store.domainStatus}
        domainVerificationToken={store.domainVerificationToken}
        cnameTarget={root ?? mainHost}
      />
      <div className="mt-8">
        <PageHeader title="Dados legais" subtitle="Razão social, CNPJ/CPF e endereço (rodapé da vitrine)" />
        <LegalSettingsForm legalName={store.legalName} taxId={store.taxId} legalAddress={parseLegalAddress(store.legalAddress)} />
      </div>
      <div className="mt-8">
        <PageHeader title="Loja em construção" subtitle="Bloqueia visitantes com uma senha, sem apagar nada" />
        <MaintenanceForm maintenanceMode={store.maintenanceMode} hasPassword={!!store.maintenancePasswordHash} />
      </div>
    </>
  );
}
