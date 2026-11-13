"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";

const NAV = [
  { href: "/", label: "Visão geral", id: "overview" },
  { href: "/products", label: "Produtos", id: "products" },
  { href: "/categories", label: "Categorias", id: "categories" },
  { href: "/orders", label: "Pedidos", id: "orders" },
  { href: "/customers", label: "Clientes", id: "customers" },
  { href: "/coupons", label: "Cupons", id: "coupons" },
  { href: "/promotions", label: "Promoções", id: "promotions" },
  { href: "/abandoned-carts", label: "Carrinhos abandonados", id: "abandoned-carts" },
  { href: "/reviews", label: "Avaliações", id: "reviews" },
  { href: "/home", label: "Página inicial", id: "home" },
  { href: "/menu", label: "Menu", id: "menu" },
  { href: "/pages", label: "Páginas", id: "pages" },
  { href: "/settings", label: "Aparência", id: "settings" },
];

type Props = { storeName: string; storeUrl: string | null; email: string; brandColor: string };

export function Sidebar({ storeName, storeUrl, email, brandColor }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex flex-col bg-ink text-bone lg:sticky lg:top-0 lg:h-screen">
      <div className="flex items-center gap-3 p-5">
        <span className="h-8 w-8 rounded-md" style={{ background: brandColor }} />
        <div className="min-w-0">
          <p className="truncate font-semibold" data-testid="sidebar-store-name">{storeName}</p>
          <p className="truncate font-mono text-[11px] text-bone/50">{email}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 lg:flex-col">
        {NAV.map((item) => (
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
        <form action={logout}>
          <button type="submit" className="font-mono text-xs text-bone/50 hover:text-bone" data-testid="logout-button">Sair</button>
        </form>
      </div>
    </aside>
  );
}
