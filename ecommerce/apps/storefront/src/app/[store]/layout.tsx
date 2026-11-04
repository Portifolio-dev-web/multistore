import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contrastText } from "@repo/db/utils";
import { getStoreBySlug } from "@/lib/store";
import { getStoreBase } from "@/lib/paths";
import { StoreProvider } from "@/components/store-context";

type Props = { children: React.ReactNode; params: { store: string } };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const store = await getStoreBySlug(params.store);
  return { title: store?.name ?? "Loja", description: store?.description ?? undefined };
}

// Só o tema (cores da loja) e o contexto do carrinho. Header/rodapé ficam em (shop)/layout.tsx —
// o /checkout não passa por ali, então fica com um layout enxuto, sem menu nem rodapé.
export default async function StoreLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  const theme = {
    "--brand": store.primaryColor,
    "--brand-contrast": contrastText(store.primaryColor),
    "--accent": store.accentColor,
  } as React.CSSProperties;
  const base = getStoreBase(store.slug);

  return (
    <StoreProvider value={{ slug: store.slug, base }}>
      <div style={theme} className="flex min-h-screen flex-col">
        {children}
      </div>
    </StoreProvider>
  );
}
