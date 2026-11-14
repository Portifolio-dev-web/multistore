import Link from "next/link";
import { dismissOnboarding } from "@/actions/onboarding";

type Item = { label: string; done: boolean; href: string; testId: string };

// F6.7: "conectar pagamento" não entra aqui — o Stripe é uma conta global da plataforma (F1.4),
// não algo que o lojista conecta por loja; "configurar frete" também não entra — frete (F1.6)
// ainda não existe no catálogo (ver Decisões).
export function OnboardingChecklist({ hasProduct, hasLogo, domainVerified }: { hasProduct: boolean; hasLogo: boolean; domainVerified: boolean }) {
  const items: Item[] = [
    { label: "Adicionar seu primeiro produto", done: hasProduct, href: "/products/new", testId: "onboarding-product" },
    { label: "Personalizar a aparência da loja (logo)", done: hasLogo, href: "/settings", testId: "onboarding-appearance" },
    { label: "Conectar um domínio próprio", done: domainVerified, href: "/settings", testId: "onboarding-domain" },
  ];
  const allDone = items.every((i) => i.done);
  if (allDone) return null;

  return (
    <section className="card mb-8 p-5" data-testid="onboarding-checklist">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Primeiros passos</h2>
        <form action={dismissOnboarding}>
          <button type="submit" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="onboarding-dismiss-button">Dispensar</button>
        </form>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.testId}>
            <Link href={item.href} className="flex items-center gap-2.5 text-sm" data-testid={item.testId}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${item.done ? "bg-lime text-ink" : "border border-ink/20 text-ink/40"}`}>
                {item.done ? "✓" : ""}
              </span>
              <span className={item.done ? "text-ink/40 line-through" : ""}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
