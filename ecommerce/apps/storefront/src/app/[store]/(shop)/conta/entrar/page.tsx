import { MagicLinkForm } from "@/components/magic-link-form";

export default function CustomerLoginPage({ params, searchParams }: { params: { store: string }; searchParams: { erro?: string } }) {
  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Entrar na minha conta</h1>
      <p className="mt-2 text-sm text-ink/60">Sem senha: a gente manda um link de acesso pro seu e-mail.</p>
      {searchParams.erro && (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700" data-testid="magic-link-expired">
          Link inválido ou expirado. Peça um novo abaixo.
        </p>
      )}
      <div className="mt-6">
        <MagicLinkForm storeSlug={params.store} />
      </div>
    </div>
  );
}
