import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { categoryAncestors } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { deleteCategory, updateCategory } from "@/actions/categories";
import { PageHeader } from "@/components/page-header";
import { CategoryForm } from "@/components/category-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const category = await prisma.category.findFirst({ where: { id: params.id, storeId } });
  if (!category) notFound();

  const categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });
  const options = categories.map((c) => ({
    id: c.id,
    label: "— ".repeat(categoryAncestors(categories, c.id).length - 1) + c.name,
  }));

  return (
    <>
      <Link href="/categories" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-categories-link">← categorias</Link>
      <PageHeader
        title={category.name}
        subtitle="Editar categoria"
        action={
          <DeleteButton
            action={deleteCategory.bind(null, category.id)}
            confirmMessage="Excluir esta categoria? Subcategorias ficam sem categoria pai; produtos mantêm as outras categorias."
            label="Excluir categoria"
            testId="delete-category-button"
          />
        }
      />
      <CategoryForm action={updateCategory.bind(null, category.id)} category={category} options={options} submitLabel="Salvar alterações" />
    </>
  );
}
