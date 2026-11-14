import Link from "next/link";

export default function NotFound() {
  const registerUrl = `${process.env.ADMIN_URL ?? "http://localhost:3001"}/register`;

  return (
    <main className="mx-auto max-w-xl px-6 py-32 text-center">
      <p className="font-display text-7xl font-bold">404</p>
      <p className="mt-3 text-ink/60">Página ou loja não encontrada.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-ghost">Ir para a página inicial</Link>
        <a href={registerUrl} className="btn-brand">Cadastrar minha loja</a>
      </div>
    </main>
  );
}
