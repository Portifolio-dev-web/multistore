import Link from "next/link";
import { prisma } from "@repo/db";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { createCategory } from "@/actions/categories";
import { PageHeader } from "@/components/page-header";
import { CategoryForm } from "@/components/category-form";

export default async function NewCategoryPage() {
  const { storeId } = await requireSession();
  const categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });
  const options = categories.map((c) => ({
    id: c.id,
    label: "— ".repeat(categoryAncestors(categories, c.id).length - 1) + c.name,
  }));

  return (
    <>
      <Link href="/categories" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-categories-link">← categorias</Link>
      <PageHeader title="Nova categoria" />
      <CategoryForm action={createCategory} options={options} submitLabel="Criar categoria" />
    </>
  );
}
