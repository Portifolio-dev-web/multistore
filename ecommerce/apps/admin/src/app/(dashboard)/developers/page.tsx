import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { revokeApiKey } from "@/actions/api-keys";
import { deleteWebhookEndpoint, sendTestWebhook } from "@/actions/webhooks";
import { PageHeader } from "@/components/page-header";
import { CreateApiKeyForm } from "@/components/create-api-key-form";
import { CreateWebhookForm } from "@/components/create-webhook-form";
import { DeleteButton } from "@/components/delete-button";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function DevelopersPage() {
  const { storeId } = await requireSession("settings");
  const [apiKeys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEndpoint.findMany({
      where: { storeId },
      include: { deliveries: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader title="Desenvolvedores" subtitle="Chaves de API e webhooks para integrar seu sistema." />

      <h2 className="font-semibold">Chaves de API</h2>
      <p className="mt-1 text-sm text-ink/60">
        Veja a <a href="/docs/api" target="_blank" rel="noreferrer" className="underline underline-offset-4">documentação da API</a>.
      </p>
      <div className="mt-3"><CreateApiKeyForm /></div>
      <section className="card mt-4 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line"><tr><th className="th">Nome</th><th className="th">Chave</th><th className="th">Último uso</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-line">
            {apiKeys.map((k) => (
              <tr key={k.id} data-testid={`api-key-row-${k.id}`}>
                <td className="td">{k.name}{k.revokedAt && <span className="ml-2 text-xs text-ink/40">(revogada)</span>}</td>
                <td className="td font-mono text-xs">{k.prefix}…</td>
                <td className="td text-ink/60">{k.lastUsedAt ? dateFmt.format(k.lastUsedAt) : "nunca"}</td>
                <td className="td text-right">
                  {!k.revokedAt && <DeleteButton action={revokeApiKey.bind(null, k.id)} confirmMessage="Revogar esta chave? Sistemas usando ela deixam de funcionar." label="Revogar" testId={`revoke-api-key-${k.id}`} />}
                </td>
              </tr>
            ))}
            {apiKeys.length === 0 && <tr><td colSpan={4} className="td py-10 text-center text-ink/50">Nenhuma chave ainda.</td></tr>}
          </tbody>
        </table>
      </section>

      <h2 className="mt-10 font-semibold">Webhooks</h2>
      <div className="mt-3"><CreateWebhookForm /></div>
      <div className="mt-4 space-y-4">
        {webhooks.map((w) => (
          <section key={w.id} className="card p-5" data-testid={`webhook-row-${w.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="break-all font-mono text-sm">{w.url}</p>
                <p className="mt-1 text-xs text-ink/50">{w.events.join(", ")}</p>
              </div>
              <div className="flex gap-2">
                <form action={sendTestWebhook.bind(null, w.id)}>
                  <button type="submit" className="btn-outline" data-testid={`test-webhook-${w.id}`}>Testar envio</button>
                </form>
                <DeleteButton action={deleteWebhookEndpoint.bind(null, w.id)} confirmMessage="Remover este webhook?" label="Remover" testId={`delete-webhook-${w.id}`} />
              </div>
            </div>
            {w.deliveries.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs" data-testid={`webhook-deliveries-${w.id}`}>
                {w.deliveries.map((d) => (
                  <li key={d.id} className="flex justify-between font-mono text-ink/60">
                    <span>{d.event} · tentativa {d.attempt}</span>
                    <span className={d.status === "SUCCESS" ? "text-emerald-700" : "text-red-700"}>{d.status}{d.responseStatus ? ` (${d.responseStatus})` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {webhooks.length === 0 && <p className="text-sm text-ink/50">Nenhum webhook cadastrado.</p>}
      </div>
    </>
  );
}
