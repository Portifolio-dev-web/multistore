import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-6xl font-medium">404</p>
        <p className="mt-2 text-ink/60">Página não encontrada.</p>
        <Link href="/" className="btn-outline mt-6">Voltar ao painel</Link>
      </div>
    </main>
  );
}
