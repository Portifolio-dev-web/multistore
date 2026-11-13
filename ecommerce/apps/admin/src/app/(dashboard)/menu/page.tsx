import { prisma } from "@repo/db";
import { parseNavigation } from "@repo/db/content";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { saveNavigation } from "@/actions/navigation";
import { PageHeader } from "@/components/page-header";
import { NavigationEditor } from "@/components/navigation-editor";

export default async function MenuPage() {
  const { storeId } = await requireSession();
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const [allCategories, pages] = await Promise.all([
    prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } }),
    prisma.page.findMany({ where: { storeId, published: true }, orderBy: { title: "asc" } }),
  ]);

  const categoryOptions = allCategories.map((c) => ({
    slug: c.slug,
    label: "— ".repeat(categoryAncestors(allCategories, c.id).length - 1) + c.name,
  }));

  return (
    <>
      <PageHeader title="Menu" subtitle="Links do cabeçalho da vitrine (categorias, páginas ou URLs)" />
      <NavigationEditor
        action={saveNavigation}
        initial={parseNavigation(store.navigation)}
        categories={categoryOptions}
        pages={pages.map((p) => ({ slug: p.slug, title: p.title }))}
      />
    </>
  );
}
