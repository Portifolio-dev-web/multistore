export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="hidden flex-col justify-between bg-ink p-12 text-bone lg:flex">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-lime">Vitrine / painel</span>
        <div>
          <p className="max-w-md text-5xl font-semibold leading-[1.05] tracking-tight">Sua loja, seus produtos, seus pedidos.</p>
          <p className="mt-6 max-w-sm text-bone/60">Gerencie catálogo, acompanhe pagamentos do Stripe e personalize a identidade visual da vitrine.</p>
        </div>
        <span className="font-mono text-xs text-bone/40">white-label commerce</span>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-rise">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-ink/60">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
