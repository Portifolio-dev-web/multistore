import Link from "next/link";
import { createPage } from "@/actions/pages";
import { PageHeader } from "@/components/page-header";
import { PageForm } from "@/components/page-form";

export default function NewPagePage() {
  return (
    <>
      <Link href="/pages" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-pages-link">← páginas</Link>
      <PageHeader title="Nova página" subtitle="Crie uma página institucional (Sobre nós, Trocas, etc.)" />
      <PageForm action={createPage} aiEnabled={!!process.env.ANTHROPIC_API_KEY} submitLabel="Criar página" />
    </>
  );
}
