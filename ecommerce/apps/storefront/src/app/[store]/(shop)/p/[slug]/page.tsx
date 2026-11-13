import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { renderSafeMarkdown } from "@repo/db/markdown";
import { getStoreBySlug } from "@/lib/store";

export default async function InstitutionalPage({ params }: { params: { store: string; slug: string } }) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const page = await prisma.page.findFirst({ where: { storeId: store.id, slug: params.slug, published: true } });
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight" data-testid="institutional-page-title">{page.title}</h1>
      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="markdown-content mt-8"
        data-testid="institutional-page-content"
        dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(page.content) }}
      />
    </article>
  );
}
