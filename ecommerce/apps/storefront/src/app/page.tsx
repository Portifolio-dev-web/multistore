import Link from "next/link";
import { prisma } from "@repo/db";
import { storeUrl } from "@repo/db/urls";

export default async function StoresIndex() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    select: { slug: true, customDomain: true, name: true, description: true, primaryColor: true, accentColor: true, _count: { select: { products: { where: { active: true } } } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <p className="label">Vitrine · lojas</p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Escolha uma loja</h1>
      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="stores-list">
        {stores.map((s, i) => (
          <li key={s.slug} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <Link href={storeUrl(s)} data-testid={`store-link-${s.slug}`} className="group block overflow-hidden rounded-3xl border border-ink/10 bg-white transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-28 items-end gap-2 p-4" style={{ background: s.primaryColor }}>
                <span className="h-4 w-4 rounded-full" style={{ background: s.accentColor }} />
              </div>
              <div className="p-5">
                <h2 className="font-display text-xl font-semibold">{s.name}</h2>
                {s.description && <p className="mt-1 line-clamp-2 text-sm text-ink/60">{s.description}</p>}
                <p className="mt-4 text-xs font-medium text-ink/40">{s._count.products} produtos →</p>
              </div>
            </Link>
          </li>
        ))}
        {stores.length === 0 && <li className="text-ink/50">Nenhuma loja cadastrada ainda.</li>}
      </ul>
    </main>
  );
}
