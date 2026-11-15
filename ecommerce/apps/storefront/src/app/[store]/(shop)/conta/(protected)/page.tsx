import { prisma } from "@repo/db";
import { getStoreBySlug } from "@/lib/store";
import { getCustomerForStore } from "@/lib/customer-session";
import { getStoreBase, storeHref } from "@/lib/paths";
import { deleteMyAccount } from "@/actions/customer-account";

export default async function AccountOverviewPage({ params: paramsPromise }: { params: Promise<{ store: string }> }) {
  const params = await paramsPromise;
  const store = await getStoreBySlug(params.store);
  const session = await getCustomerForStore(store!.id);
  const customer = await prisma.customer.findUnique({ where: { id: session!.customerId } });
  const base = await getStoreBase(params.store);

  return (
    <div data-testid="account-overview">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Olá, {customer?.name?.split(" ")[0] || customer?.email}
      </h1>
      <p className="mt-2 text-sm text-ink/60" data-testid="account-email">{customer?.email}</p>

      <section className="mt-12 border-t border-ink/10 pt-8" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="font-display text-lg font-semibold">Seus dados</h2>
        <p className="mt-1 text-sm text-ink/60">Você pode baixar uma cópia de tudo que a loja guarda sobre você ou excluir sua conta.</p>
        <a href={storeHref(base, "/conta/meus-dados")} className="btn-ghost mt-4 inline-flex" data-testid="account-export-data">
          Baixar meus dados
        </a>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-red-700" data-testid="account-delete-toggle">Excluir minha conta</summary>
          <form action={deleteMyAccount.bind(null, params.store)} className="mt-3 space-y-3">
            <p className="text-ink/70">
              Seu nome, e-mail, telefone, documento e endereços serão apagados. Os pedidos já feitos continuam registrados sem
              seus dados pessoais, porque a lei fiscal exige. Não dá para desfazer.
            </p>
            <button type="submit" className="rounded-full bg-red-700 px-4 py-2 font-semibold text-white" data-testid="account-delete-confirm">
              Excluir definitivamente
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}
