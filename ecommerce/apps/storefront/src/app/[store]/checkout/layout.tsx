import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";

type Props = { children: React.ReactNode; params: { store: string } };

// Layout enxuto do checkout: sem menu nem rodapé, só o nome da loja. Mobile primeiro.
export default async function CheckoutLayout({ children, params }: Props) {
  const store = await getStoreBySlug(params.store);
  if (!store) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink/5 px-5 py-4 sm:px-8">
        <span className="font-display text-lg font-semibold tracking-tight" data-testid="checkout-store-name">
          {store.name}
        </span>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
