type Props = { liveUrl: string; subdomainUrl: string | null; customDomain: string | null; cnameTarget: string };

export function DomainInfo({ liveUrl, subdomainUrl, customDomain, cnameTarget }: Props) {
  const host = cnameTarget.split(":")[0];
  return (
    <section className="card mt-6 max-w-[calc(100%-0px)] p-6 xl:max-w-none" data-testid="domain-info">
      <h2 className="font-semibold">Endereços da loja</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="label">Endereço ativo</dt>
          <dd><a href={liveUrl} target="_blank" rel="noreferrer" className="break-all font-mono text-sm underline underline-offset-4" data-testid="domain-live-url">{liveUrl}</a></dd>
        </div>
        {subdomainUrl && (
          <div>
            <dt className="label">Subdomínio automático</dt>
            <dd className="break-all font-mono text-sm" data-testid="domain-subdomain-url">{subdomainUrl}</dd>
          </div>
        )}
      </dl>
      <div className="mt-6 rounded-xl bg-bone p-4 text-sm leading-relaxed">
        <p className="font-semibold">Como conectar um domínio próprio</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink/70">
          <li>Informe o domínio no campo <em>Domínio próprio</em> acima e salve.</li>
          <li>
            No seu provedor de DNS, crie um registro <span className="font-mono">CNAME</span> de{" "}
            <span className="font-mono">{customDomain ?? "www.minhaloja.com.br"}</span> apontando para{" "}
            <span className="font-mono">{host}</span>.
          </li>
          <li>Configure o certificado HTTPS no proxy reverso (Caddy, Traefik ou Nginx + Let&apos;s Encrypt).</li>
        </ol>
      </div>
    </section>
  );
}
