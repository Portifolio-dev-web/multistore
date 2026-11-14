import Link from "next/link";
import { PLAN_LABEL, PLAN_LIMITS, PLAN_ORDER } from "@repo/db/plans";
import { formatBRL } from "@repo/db/utils";

const BENEFITS = [
  { title: "Vitrine pronta", text: "Catálogo, carrinho, cupons e avaliações já funcionando — só personalizar." },
  { title: "Pagamento integrado", text: "Checkout seguro via Stripe, com cartão e Pix/boleto quando o banco habilitar." },
  { title: "SEO e marketing", text: "Metadados, sitemap, pixels de analytics e feeds de produto prontos de fábrica." },
];

const FAQ = [
  { q: "Preciso saber programar?", a: "Não. Cadastre sua loja, adicione produtos pelo painel e sua vitrine já está no ar." },
  { q: "Posso usar meu próprio domínio?", a: "Sim, nos planos Essencial e Pro — basta conectar e verificar o domínio no painel." },
  { q: "Como funciona a cobrança?", a: "Assinatura mensal recorrente via Stripe, com 14 dias de teste gratuito em qualquer plano pago." },
];

// F6.4: a lista pública de lojas saiu daqui (nenhuma loja fica exposta sem querer) — essa rota
// agora é a página de venda da plataforma, com CTA para o cadastro do lojista no admin.
export default function PlatformHome() {
  const registerUrl = `${process.env.ADMIN_URL ?? "http://localhost:3001"}/register`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <p className="label">MultiStore</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        Sua loja online, no ar em minutos.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-ink/60">
        Catálogo, pagamentos, cupons, e-mails transacionais e SEO — tudo pronto. Você só cuida do produto.
      </p>
      <div className="mt-8 flex gap-3">
        <a href={registerUrl} className="btn-brand" data-testid="platform-register-link">Criar minha loja</a>
      </div>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-3xl border border-ink/10 bg-white p-6">
            <h2 className="font-display text-lg font-semibold">{b.title}</h2>
            <p className="mt-2 text-sm text-ink/60">{b.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-20">
        <h2 className="font-display text-3xl font-bold tracking-tight">Planos</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const limits = PLAN_LIMITS[plan];
            return (
              <div key={plan} className="rounded-3xl border border-ink/10 bg-white p-6" data-testid={`platform-plan-${plan}`}>
                <p className="label">{PLAN_LABEL[plan]}</p>
                <p className="mt-2 text-2xl font-semibold">{limits.priceInCents === 0 ? "Grátis" : `${formatBRL(limits.priceInCents)}/mês`}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink/60">
                  <li>Até {limits.maxProducts === Infinity ? "ilimitados" : limits.maxProducts} produtos</li>
                  <li>Até {limits.maxUsers} usuário{limits.maxUsers > 1 ? "s" : ""} na equipe</li>
                  <li>{limits.customDomain ? "Domínio próprio" : "Sem domínio próprio"}</li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1 text-sm text-ink/60">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mt-20 flex gap-4 border-t border-ink/10 pt-6 text-sm text-ink/50">
        <Link href="/termos" data-testid="platform-terms-link">Termos de uso</Link>
        <Link href="/privacidade" data-testid="platform-privacy-link">Política de privacidade</Link>
      </footer>
    </main>
  );
}
