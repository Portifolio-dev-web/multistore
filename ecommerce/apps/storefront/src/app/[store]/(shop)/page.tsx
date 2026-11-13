import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase, storeHref } from "@/lib/paths";
import { parseHomeSections } from "@repo/db/content";
import { SectionRenderer } from "@/components/sections/section-renderer";

type Props = { params: { store: string }; searchParams: { preview?: string } };

// F4.1: a home virou seções configuráveis pelo admin (`/home`); o catálogo com busca/filtros
// mudou para `/busca`. `?preview=1` mostra o rascunho (nunca o publicado) — não precisa de
// autenticação porque o rascunho não tem nada sensível, só ainda não está no ar de verdade.
export default async function StorePage({ params, searchParams }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const raw = searchParams.preview === "1" ? (store.homeSectionsDraft ?? store.homeSections) : store.homeSections;
  const sections = parseHomeSections(raw);
  const base = getStoreBase(store.slug);

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-5 py-10 sm:px-8">
      {searchParams.preview === "1" && (
        <p className="rounded-2xl bg-accent/30 px-4 py-2 text-center text-sm font-medium text-ink" data-testid="preview-banner">
          Você está vendo o rascunho — esta página ainda não foi publicada.
        </p>
      )}
      {sections.length === 0 ? (
        <section className="py-16 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{store.name}</h1>
          {store.description && <p className="mx-auto mt-3 max-w-md text-ink/60">{store.description}</p>}
          <Link href={storeHref(base, "/busca")} className="btn-brand mt-6">Ver produtos</Link>
        </section>
      ) : (
        sections.map((section) => (
          <SectionRenderer key={section.id} section={section} storeId={store.id} storeSlug={store.slug} base={base} />
        ))
      )}
    </div>
  );
}
