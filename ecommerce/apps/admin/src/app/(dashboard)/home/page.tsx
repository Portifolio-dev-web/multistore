import { prisma } from "@repo/db";
import { parseHomeSections } from "@repo/db/content";
import { categoryAncestors } from "@repo/db/utils";
import { storeUrl } from "@repo/db/urls";
import { requireSession } from "@/lib/session";
import { discardHomeSectionsDraft, publishHomeSections, saveHomeSectionsDraft } from "@/actions/home-sections";
import { PageHeader } from "@/components/page-header";
import { HomeSectionsEditor } from "@/components/home-sections-editor";

export default async function HomeSectionsPage() {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const allCategories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });

  const categoryOptions = allCategories.map((c) => ({
    slug: c.slug,
    label: "— ".repeat(categoryAncestors(allCategories, c.id).length - 1) + c.name,
  }));

  const draft = parseHomeSections(store.homeSectionsDraft ?? store.homeSections);
  const hasDraft = JSON.stringify(store.homeSectionsDraft ?? store.homeSections) !== JSON.stringify(store.homeSections);

  return (
    <>
      <PageHeader title="Página inicial" subtitle="Seções da vitrine — edite num rascunho e publique quando estiver pronto" />
      <HomeSectionsEditor
        saveAction={saveHomeSectionsDraft}
        publishAction={publishHomeSections}
        discardAction={discardHomeSectionsDraft}
        initial={draft}
        hasDraft={hasDraft}
        categories={categoryOptions}
        previewUrl={`${storeUrl(store)}?preview=1`}
      />
    </>
  );
}
