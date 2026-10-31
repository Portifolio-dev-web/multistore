import Link from "next/link";

export type FilterValues = { q: string; category: string; min: string; max: string; sort: string; inStock: boolean };

type Props = { base: string; categories: string[]; values: FilterValues };

// Formulário GET: os filtros ficam na URL e são aplicados no Server Component
export function ProductFilters({ base, categories, values }: Props) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <form method="get" className="space-y-5 rounded-3xl border border-ink/10 bg-white p-5" data-testid="filters-form">
        <div>
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={values.q} placeholder="Nome ou descrição" className="field" data-testid="filter-search-input" />
        </div>
        <div>
          <label className="label" htmlFor="category">Categoria</label>
          <select id="category" name="category" defaultValue={values.category} className="field" data-testid="filter-category-select">
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Preço (R$)</span>
          <div className="flex gap-2">
            <input name="min" inputMode="decimal" defaultValue={values.min} placeholder="Mín." className="field" data-testid="filter-min-price-input" />
            <input name="max" inputMode="decimal" defaultValue={values.max} placeholder="Máx." className="field" data-testid="filter-max-price-input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sort">Ordenar</label>
          <select id="sort" name="sort" defaultValue={values.sort} className="field" data-testid="filter-sort-select">
            <option value="recent">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name">Nome (A–Z)</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="stock" value="1" defaultChecked={values.inStock} className="h-4 w-4 accent-[var(--brand)]" data-testid="filter-in-stock-checkbox" />
          Somente em estoque
        </label>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-brand flex-1 py-2.5" data-testid="filter-apply-button">Filtrar</button>
          <Link href={base || "/"} className="btn-ghost" data-testid="filter-clear-link">Limpar</Link>
        </div>
      </form>
    </aside>
  );
}
