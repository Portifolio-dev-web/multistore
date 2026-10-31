import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="font-display text-7xl font-bold">404</p>
      <p className="mt-3 text-ink/60">Página ou loja não encontrada.</p>
      <Link href="/" className="btn-ghost mt-8">Ver todas as lojas</Link>
    </main>
  );
}
