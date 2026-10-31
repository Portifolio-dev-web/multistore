import Link from "next/link";

export default function CheckoutCancel({ params }: { params: { store: string } }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Pagamento cancelado</h1>
      <p className="mt-3 text-ink/60">Nenhuma cobrança foi feita. Seus itens continuam no carrinho.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href={`/${params.store}/cart`} className="btn-brand" data-testid="cancel-back-to-cart">Voltar ao carrinho</Link>
        <Link href={`/${params.store}`} className="btn-ghost" data-testid="cancel-back-to-store">Ver produtos</Link>
      </div>
    </div>
  );
}
