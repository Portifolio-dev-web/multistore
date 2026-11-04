import { CartView } from "@/components/cart-view";

export default function CartPage({ params }: { params: { store: string } }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Seu carrinho</h1>
      <CartView storeSlug={params.store} />
    </div>
  );
}
