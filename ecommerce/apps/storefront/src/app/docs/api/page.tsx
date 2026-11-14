const CODE = "font-mono text-xs leading-relaxed";

export default function ApiDocsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">API pública</h1>
      <p className="mt-4 text-sm text-ink/60">
        REST simples para integrar seu ERP, planilha ou sistema de estoque. Gere uma chave em
        <em> Desenvolvedores</em> no painel do lojista.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Autenticação</h2>
      <p className="mt-2 text-sm text-ink/60">Toda requisição leva a chave no cabeçalho:</p>
      <pre className={`${CODE} mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-bone`}>Authorization: Bearer SUA_CHAVE_DE_API</pre>

      <h2 className="mt-10 text-xl font-semibold">Endpoints</h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li><code className={CODE}>GET /api/v1/products</code> — lista produtos e variantes (até 100)</li>
        <li><code className={CODE}>GET /api/v1/products/:id</code> — um produto</li>
        <li><code className={CODE}>PATCH /api/v1/products/:id</code> — atualiza estoque de uma variante: <code className={CODE}>{"{ variantId, stock }"}</code></li>
        <li><code className={CODE}>GET /api/v1/orders</code> — lista pedidos (até 100)</li>
        <li><code className={CODE}>GET /api/v1/orders/:id</code> — um pedido</li>
      </ul>
      <p className="mt-3 text-xs text-ink/50">Limite: 60 requisições por minuto por chave.</p>

      <h2 className="mt-10 text-xl font-semibold">Exemplo</h2>
      <pre className={`${CODE} mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-bone`}>
curl https://sua-loja.com/api/v1/products{"\n"}  -H &quot;Authorization: Bearer SUA_CHAVE_DE_API&quot;
      </pre>

      <h2 className="mt-10 text-xl font-semibold">Webhooks</h2>
      <p className="mt-2 text-sm text-ink/60">
        Cadastre uma URL em <em>Desenvolvedores</em> e escolha os eventos: <code className={CODE}>order.created</code>,{" "}
        <code className={CODE}>order.paid</code>, <code className={CODE}>product.updated</code>. Cada envio chega como
        <code className={CODE}> POST</code> com o corpo <code className={CODE}>{"{ event, data, timestamp }"}</code> e a
        assinatura HMAC-SHA256 do corpo no cabeçalho <code className={CODE}>X-Webhook-Signature</code>, assinada com o
        segredo mostrado na criação do endpoint. Confira calculando o mesmo HMAC do corpo recebido e comparando.
      </p>
    </article>
  );
}
