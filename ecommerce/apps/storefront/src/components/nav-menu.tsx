import Link from "next/link";
import type { NavItem } from "@repo/db/content";
import { storeHref } from "@/lib/paths";

function hrefFor(base: string, item: NavItem): string {
  if (item.type === "category") return storeHref(base, `/categorias/${item.value}`);
  if (item.type === "page") return storeHref(base, `/p/${item.value}`);
  return item.value;
}

export function NavMenu({ base, items }: { base: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <nav className="hidden items-center gap-5 text-sm font-medium lg:flex" data-testid="nav-menu">
        {items.map((item) => (
          <Link key={item.id} href={hrefFor(base, item)} className="text-ink/70 hover:text-ink" data-testid={`nav-menu-item-${item.id}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      {/* Menu mobile: <details> nativo, sem JS — abre/fecha sozinho */}
      <details className="relative lg:hidden" data-testid="nav-menu-mobile">
        <summary className="list-none cursor-pointer rounded-full border border-ink/15 px-3 py-1.5 text-sm" aria-label="Abrir menu">
          ☰
        </summary>
        <nav className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-ink/10 bg-white p-2 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.id}
              href={hrefFor(base, item)}
              className="block rounded-xl px-3 py-2 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink"
              data-testid={`nav-menu-mobile-item-${item.id}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
