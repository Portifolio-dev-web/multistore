// F6.5: SSL automático via API de domínio da hospedagem (decisão do usuário: Vercel) — sem as
// variáveis configuradas, é um no-op documentado, pra não forçar todo ambiente de dev/self-host
// a ter um projeto Vercel só para rodar a plataforma.
function hostingConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  return { token, projectId, teamQuery };
}

export async function addDomainToHostingProject(domain: string): Promise<void> {
  const config = hostingConfig();
  if (!config) {
    console.warn(`[hosting] VERCEL_API_TOKEN/VERCEL_PROJECT_ID não configurados — domínio "${domain}" não foi adicionado automaticamente ao projeto`);
    return;
  }
  const res = await fetch(`https://api.vercel.com/v10/projects/${config.projectId}/domains${config.teamQuery}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
  if (!res.ok) console.error(`[hosting] falha ao adicionar domínio "${domain}" na Vercel`, await res.text());
}

export async function removeDomainFromHostingProject(domain: string): Promise<void> {
  const config = hostingConfig();
  if (!config) return;
  try {
    await fetch(`https://api.vercel.com/v9/projects/${config.projectId}/domains/${domain}${config.teamQuery}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.token}` },
    });
  } catch (err) {
    console.error(`[hosting] falha ao remover domínio "${domain}" na Vercel`, err);
  }
}
