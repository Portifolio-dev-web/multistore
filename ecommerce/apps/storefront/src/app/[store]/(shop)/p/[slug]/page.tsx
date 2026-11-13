import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { renderSafeMarkdown } from "@repo/db/markdown";
import { storeUrl } from "@repo/db/urls";
import { getStoreBySlug } from "@/lib/store";

type Props = { params: { store: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await getStoreBySlug(params.store);
  if (!store) return {};
  const page = await prisma.page.findFirst({ where: { storeId: store.id, slug: params.slug, published: true } });
  if (!page) return {};
  const title = page.seoTitle || `${page.title} — ${store.name}`;
  const description = page.seoDescription || undefined;
  const url = `${storeUrl(store)}/p/${page.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function InstitutionalPage({ params }: Props) {
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
