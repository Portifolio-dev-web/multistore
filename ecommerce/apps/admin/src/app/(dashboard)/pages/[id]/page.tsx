import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { deletePage, updatePage } from "@/actions/pages";
import { PageHeader } from "@/components/page-header";
import { PageForm } from "@/components/page-form";
import { DeleteButton } from "@/components/delete-button";

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const page = await prisma.page.findFirst({ where: { id: params.id, storeId } });
  if (!page) notFound();

  return (
    <>
      <Link href="/pages" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-pages-link">← páginas</Link>
      <PageHeader
        title={page.title}
        subtitle="Editar página"
        action={
          <DeleteButton action={deletePage.bind(null, page.id)} confirmMessage="Excluir esta página?" label="Excluir página" testId="delete-page-button" />
        }
      />
      <PageForm action={updatePage.bind(null, page.id)} page={page} aiEnabled={!!process.env.ANTHROPIC_API_KEY} submitLabel="Salvar alterações" />
    </>
  );
}
