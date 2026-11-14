"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@repo/db";
import { hasPermission } from "@repo/db/permissions";
import { logout, switchStore } from "@/actions/auth";

type NavItem = { href: string; label: string; id: string; permission?: "settings" | "team" | "billing" };

const NAV: NavItem[] = [
  { href: "/", label: "Visão geral", id: "overview" },
  { href: "/products", label: "Produtos", id: "products" },
  { href: "/categories", label: "Categorias", id: "categories" },
  { href: "/orders", label: "Pedidos", id: "orders" },
  { href: "/customers", label: "Clientes", id: "customers" },
  { href: "/coupons", label: "Cupons", id: "coupons" },
  { href: "/promotions", label: "Promoções", id: "promotions" },
  { href: "/abandoned-carts", label: "Carrinhos abandonados", id: "abandoned-carts" },
  { href: "/reviews", label: "Avaliações", id: "reviews" },
  { href: "/reports", label: "Relatórios", id: "reports" },
  { href: "/home", label: "Página inicial", id: "home" },
  { href: "/menu", label: "Menu", id: "menu" },
  { href: "/pages", label: "Páginas", id: "pages" },
  { href: "/settings", label: "Aparência", id: "settings", permission: "settings" },
  { href: "/team", label: "Equipe", id: "team", permission: "team" },
  { href: "/billing", label: "Cobrança", id: "billing", permission: "billing" },
  { href: "/developers", label: "Desenvolvedores", id: "developers", permission: "settings" },
];

type Props = {
  storeName: string;
  storeUrl: string | null;
  email: string;
  brandColor: string;
  role: Role;
  stores: { id: string; name: string }[];
  activeStoreId: string;
};

export function Sidebar({ storeName, storeUrl, email, brandColor, role, stores, activeStoreId }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const nav = NAV.filter((item) => !item.permission || hasPermission(role, item.permission));

  return (
    <aside className="flex flex-col bg-ink text-bone lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center gap-3 p-5">
        <span className="h-8 w-8 shrink-0 rounded-md" style={{ background: brandColor }} />
        <div className="min-w-0">
          {stores.length > 1 ? (
            <select
              defaultValue={activeStoreId}
              onChange={(e) => switchStore(e.target.value)}
              className="w-full truncate bg-transparent font-semibold text-bone outline-none"
              data-testid="store-switcher"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="text-ink">{s.name}</option>
              ))}
            </select>
          ) : (
            <p className="truncate font-semibold" data-testid="sidebar-store-name">{storeName}</p>
          )}
          <p className="truncate font-mono text-[11px] text-bone/50">{email}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 lg:flex-col">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.id}-link`}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${isActive(item.href) ? "bg-lime font-semibold text-ink" : "text-bone/70 hover:bg-white/5 hover:text-bone"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto hidden space-y-2 p-5 lg:block">
        {storeUrl && (
          <a href={storeUrl} target="_blank" rel="noreferrer" className="block font-mono text-xs text-lime hover:underline" data-testid="view-storefront-link">
            Ver vitrine ↗
          </a>
        )}
        <Link href="/account" className="block font-mono text-xs text-bone/70 hover:text-bone" data-testid="nav-account-link">Minha conta</Link>
        <form action={logout}>
          <button type="submit" className="font-mono text-xs text-bone/50 hover:text-bone" data-testid="logout-button">Sair</button>
        </form>
      </div>
    </aside>
  );
}
