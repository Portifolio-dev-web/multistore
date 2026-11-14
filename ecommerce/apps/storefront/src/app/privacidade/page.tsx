export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Política de privacidade</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink/70">
        <p>Esta política descreve como a plataforma MultiStore trata os dados de lojistas e visitantes das vitrines, em conformidade com a LGPD (Lei 13.709/2018).</p>
        <p>Dados de cadastro do lojista (nome, e-mail, senha) são usados exclusivamente para operar o painel administrativo e a assinatura.</p>
        <p>Dados de clientes de cada loja (nome, e-mail, endereço, pedidos) pertencem àquela loja e são usados só para processar compras, entregas e comunicação relacionada.</p>
        <p>Não vendemos dados pessoais a terceiros. Cookies de analytics/marketing só são carregados após o consentimento do visitante.</p>
      </div>
    </article>
  );
}
