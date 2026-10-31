import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) notFound();

  return (
    <>
      <PageHeader title="Aparência da loja" subtitle="Nome, endereço, logo e cores aplicados na vitrine." />
      <SettingsForm store={store} />
    </>
  );
}
