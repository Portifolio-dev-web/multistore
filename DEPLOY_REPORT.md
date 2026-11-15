# DEPLOY_REPORT — MultiStore (Vitrine Commerce)

Data da auditoria: **2026-11-14** · Branch auditada: `feat/f4-aparencia-personalizavel` (commit `c89d96c`) · Modo: somente leitura (nenhum arquivo além deste foi alterado; nenhum recurso pago criado).

Premissas usadas (dos colchetes do pedido — corrija se estiverem erradas): teto **R$ 100/mês**; 2 primeiros meses sem receita; **~50 usuários/dia, 1–3 lojistas**; **~2 h/semana** de manutenção; contas existentes: **GitHub, Vercel, Render**; cartão em reais (dólar + IOF).

Caminhos de arquivo são relativos a `ecommerce/`, salvo indicação.

---

## 1. Veredito

# NÃO PRONTO — mas perto: 4 bloqueadores, todos de esforço P (≈ 1 dia de trabalho)

O código está num nível acima da média para um projeto solo: validação Zod em todas as Server Actions, isolamento entre lojas consistente, webhooks idempotentes com corpo cru, upload com magic bytes, SSRF bloqueado nos webhooks de saída, migrations versionadas, Dockerfile multi-stage non-root, CI com typecheck/lint/test/build/E2E. **Nenhum segredo encontrado no código nem no histórico git.**

O que impede o deploy hoje:

1. Next.js **14.2.5** pinado — 4 CVEs críticas (bypass do middleware, que é a 1ª barreira do admin e o isolador de lojas da vitrine).
2. `remotePatterns` do `next/image` lê `S3_PUBLIC_URL` **em tempo de build** e o Dockerfile não a passa → **toda foto de produto quebra** no deploy em Docker.
3. Não existe caminho para rodar `prisma migrate deploy` fora do `docker-compose` (imagem final não tem o Prisma CLI) → deploy em PaaS sobe com schema vazio/velho.
4. Modelo de negócio: **uma conta Stripe recebe o dinheiro de todas as lojas** (F1.4 não feita) e o **cadastro de lojistas é aberto por padrão**. Para a Fase 0 isso só é aceitável se você operar **só lojas suas** com `ALLOW_REGISTRATION=false`.

---

## 2. Problemas classificados

Esforço: **P** ≤ 2 h · **M** ½–2 dias · **G** > 2 dias.

### Bloqueadores (impedem o deploy)

| # | Problema | Evidência | Risco | Correção | Esf. |
|---|---|---|---|---|---|
| B1 | Next.js 14.2.5 com CVEs críticas (CVE-2025-29927 bypass de middleware via `x-middleware-subrequest`, corrigido em 14.2.25; CVE-2024-51479; CVE-2024-46982). `yarn audit`: 4 critical + 12 high só do `next`. | `apps/admin/package.json:19`, `apps/storefront/package.json:16` (`"next": "14.2.5"`); `node_modules/next/package.json` = 14.2.5; `apps/admin/src/middleware.ts:4-19` é a 1ª barreira; `apps/storefront/src/middleware.ts` isola lojas por host | Rota que esqueça `requireSession()` fica aberta; manipulação do roteamento multi-loja | Subir para a última **14.2.x** (patch, sem breaking) e rodar `yarn typecheck && yarn build && yarn e2e`. 15.x fica para depois. | **P** |
| B2 | Host do S3 fixado em build: `remotePatterns` deriva de `S3_PUBLIC_URL` no `next.config.mjs`, mas o stage `builder` do Dockerfile não recebe essa variável → cai em `localhost`, e `next/image` recusa as imagens em produção | `apps/storefront/next.config.mjs:7-12,26`; `Dockerfile:6-15` (sem `ARG S3_PUBLIC_URL`) | Vitrine inteira sem fotos | `ARG S3_PUBLIC_URL` + `ENV` no stage `builder` (e passar `--build-arg`), **ou** `remotePatterns: [{ protocol: "https", hostname: "**" }]` | **P** |
| B3 | Migrations só rodam pelo serviço `migrate` do compose (stage `builder`); a imagem `runner` (standalone) não tem Prisma CLI; nenhum release hook | `docker-compose.yml:37-44`; `Dockerfile:29-37`; `packages/db/package.json:17` | Deploy em PaaS sobe sem tabelas → 500 em massa | Definir `release_command`/pre-deploy na plataforma rodando `yarn db:deploy` a partir da imagem `builder` (ou adicionar `prisma` CLI + schema ao runner) | **P** |
| B4 | Conta Stripe única para todas as lojas + cadastro aberto por padrão. Você vira intermediador de pagamentos (fiscal, chargeback, repasse manual; ToS do Stripe exige Connect para plataformas) | `apps/storefront/src/actions/checkout.ts:254-258`, `lib/stripe.ts:13`; `schema.prisma` sem `stripeAccountId`; `apps/admin/src/actions/auth.ts:75` (`ALLOW_REGISTRATION` só bloqueia com `"false"`); `.env.example:52`, `docker-compose.yml:98` default `true`; `CLAUDE.md:361` admite que F1.4 está pendente | Qualquer pessoa cria loja na sua infra e vende usando a sua conta Stripe | **Fase 0:** `ALLOW_REGISTRATION=false` em produção (P). **Antes de aceitar lojista externo:** Stripe Connect Express (G) — já existe branch `origin/feat/f1-4-recebimento-por-loja` | **P** / **G** |

### Críticos (corrigir na 1ª semana)

| # | Problema | Evidência | Risco | Correção | Esf. |
|---|---|---|---|---|---|
| C1 | Backup inexistente fora do compose: `backup-db.sh` usa `docker compose exec`, grava em disco local, sem agendamento; `restore-db.sh` é interativo (`read`); restauração nunca testada | `scripts/backup-db.sh:6,13`; `scripts/restore-db.sh:8-13` | Perda total de pedidos com banco gerenciado (Neon Free guarda só 6 h de restore) | GitHub Actions `schedule` diário: `pg_dump "$DATABASE_URL" \| gzip` → upload no R2 (`aws s3 cp`), reter 14; **restaurar uma vez** num banco vazio e anotar o passo a passo | **P/M** |
| C2 | Sem headers de segurança (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy); `X-Powered-By` ligado | `apps/admin/next.config.mjs:7-18`; `apps/storefront/next.config.mjs:16-31` (nenhum `headers()`) | Clickjacking do admin, sniffing, vazamento de referrer | `async headers()` com `X-Frame-Options: DENY` (admin)/`SAMEORIGIN` (vitrine), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`; `poweredByHeader: false`. CSP começar em `Report-Only` (pixels/GTM na vitrine) | **P** (sem CSP) / **M** |
| C3 | Endpoints que mandam e-mail ou criam registro **sem rate limit**: cadastro de lojista, reset de senha, magic link do cliente, newsletter, avaliação, checkout (cria `Order` PENDING + reserva estoque a cada chamada) | `apps/admin/src/actions/auth.ts:74-111,131-141`; `apps/storefront/src/actions/customer-auth.ts:18-42`; `newsletter.ts:12-27`; `reviews.ts:20-57`; `checkout.ts` (0 ocorrências de limite) | E-mail bombing, estouro da cota SMTP (Resend Free = 100/dia), **esgotar estoque com reservas falsas**, lojas/clientes fantasmas; o lock de login por e-mail (`auth.ts:38-42`) permite travar a conta de um lojista legítimo com 5 tentativas | Reaproveitar o padrão `LoginAttempt` (tabela + `count` por janela) com chave `ip`+`email` nos 6 pontos; opcional Turnstile no cadastro/magic link | **M** |
| C4 | Política de privacidade padrão é placeholder; loja nova vai ao ar coletando CPF, telefone e endereço sem política | `packages/db/src/content.ts:117` ("Descreva aqui como os dados dos clientes são tratados.") | LGPD art. 9º; Decreto 7.962/2013 | Texto-modelo real com placeholders de `legalName`/`taxId`/e-mail do encarregado; aviso no admin enquanto não editada (mesmo padrão do aviso de `legalName` em `/settings`) | **P** |
| C5 | Seed roda em **todo** `docker compose up` e cria lojista com a senha do `.env`; `.env.example` traz senhas "funcionais"; compose publica Postgres (5432) e RustFS (9000) em `0.0.0.0` | `docker-compose.yml:44,47-48,26-27,131-132`; `.env.example:3,31,93-94`; `packages/db/prisma/seed.ts:104-110` | Numa VPS: admin com senha pública + banco e storage expostos à internet | `db:seed` só com `RUN_SEED=true`; `SEED_ADMIN_*` vazios no exemplo; `ports:` em `127.0.0.1:` ou remover | **P** |
| C6 | Conexões/pool sem orientação para Postgres gerenciado: sem `connection_limit`; 14 `$transaction` interativos (quebram atrás de pooler em modo transaction sem `?pgbouncer=true`) | `packages/db/src/client.ts:5-9`; grep `$transaction` | Esgotar `max_connections` do banco gratuito; transações falhando em produção | Documentar `DATABASE_URL` direta com `?connection_limit=5` por réplica (ou pooled + `pgbouncer=true` e `DIRECT_URL` para migrations) | **P** |

### Importantes

| # | Problema | Evidência | Risco | Correção | Esf. |
|---|---|---|---|---|---|
| I1 | E-mail SMTP síncrono e sem timeout dentro do webhook do Stripe; nodemailer sem `pool`/timeouts | `apps/storefront/src/lib/orders.ts:57-58`; `packages/mail/src/transport.ts:8-13` | SMTP lento segura o webhook → Stripe dá timeout e reenvia (idempotente, mas atrasa o cliente em `/checkout/success`) | `connectionTimeout/greetingTimeout/socketTimeout` ≈ 10 s e `pool: true` no `createTransport`; opcional disparar e-mail sem `await` | **P** |
| I2 | Cron de carrinho abandonado sem limite nem corte de idade; `review-requests` com N+1; sem `maxDuration` | `apps/storefront/src/app/api/cron/abandoned-carts/route.ts:24-27`; `review-requests/route.ts:21-30` | Cresce para sempre; estoura timeout da plataforma/cron-job.org (30 s) | `where createdAt >= 2 dias`, `take: 200`, índice `@@index([recoveredOrderId, unsubscribedAt, createdAt])` em `AbandonedCart`; índice `(status, fulfillmentStatus, deliveredAt)` em `Order` | **P** |
| I3 | Sem expurgo de `LoginAttempt`, `CustomerLoginToken`, `UserToken`, `AbandonedCart`, `WebhookDelivery`, `AiGeneration`, `CookieConsentLog` | `schema.prisma:124,144,258,316,333,438`; nenhum `deleteMany` de limpeza | Banco gratuito (0,5–1 GB) estoura; retenção indevida de PII (`AbandonedCart.email/phone`) | `/api/cron/cleanup` (mesmo padrão `CRON_SECRET`) com `deleteMany` por idade (30–90 dias) | **P** |
| I4 | Retry de webhook de saída depende do processo vivo (`setTimeout`) | `packages/db/src/webhooks.ts:87-92` | Perde-se em restart; **nunca roda em serverless** | Aceitar e documentar (é v1) ou fila simples em tabela consumida pelo cron existente | **M** |
| I5 | Titular sem autoatendimento LGPD: exportar/anonimizar só pelo lojista | `apps/admin/src/actions/customers.ts:14`; `api/customers/[id]/export/route.ts:8` | Prazo legal de 15 dias depende do lojista responder | Botões "Baixar meus dados"/"Excluir minha conta" em `/{slug}/conta` reaproveitando as mesmas funções | **M** |
| I6 | Dockerfile sem lockfile travado (`COPY yarn.lock*` opcional; `yarn install` sem `--frozen-lockfile`) | `Dockerfile:8,12` | Imagem resolve versões diferentes do CI | `COPY yarn.lock ./` + `yarn install --frozen-lockfile` | **P** |
| I7 | **`origin/main` está 27 commits atrás** (último commit 2026-11-04); CI só roda em PR/`main` → nada das Fases 2–6 passou pelo CI. Além disso, `turbo run test` agora inclui o workspace `e2e` (que roda `prisma migrate reset`) — o job `build` do CI não tem Postgres e **vai falhar** em `yarn test` | `git rev-list origin/main..HEAD` = 27; `.github/workflows/ci.yml:17-34` (job sem serviço Postgres); `e2e/package.json` `"test": "playwright test"`; `e2e/global-setup.mts:25` | Deploy de código nunca validado em CI; CI vermelho no 1º PR | Abrir PR para `main`; no `turbo.json`/`e2e/package.json` renomear o script do e2e (ex. `e2e`) para sair do `turbo run test`, ou filtrar `--filter=!e2e` no job `build` | **P** |
| I8 | Sem CD nem estratégia de rollback; README sugere tag `:latest` | `ecommerce/README.md:188-191`; nenhum workflow de deploy | Sem tag imutável não há rollback | Tag por `git sha`; rollback = redeploy da tag anterior (Fly: `fly releases` + `fly deploy -i <imagem>`) | **P** |
| I9 | Documentação diverge do código em pontos que mudam decisão de infra | `README.md:143,145,146,198`, `CLAUDE.md:357` (dizem lock de login "em memória" — hoje é `LoginAttempt` no banco, `auth.ts:38-46`; "User pertence a uma Store" — hoje `Membership`; "estoque baixa no PAID" — baixa na reserva) | Decisão de "instância única" desnecessária | Ajustar os 3 trechos | **P** |
| I10 | `STOREFRONT_INTERNAL_URL` usada no middleware mas ausente do `.env.example`; no compose vale `http://localhost:3000` — não funciona com middleware em edge (Vercel) | `apps/storefront/src/middleware.ts:13`; `docker-compose.yml:74`; `turbo.json:9` | Resolve de domínio próprio falha silenciosamente | Adicionar ao `.env.example`; em PaaS apontar para a URL pública | **P** |
| I11 | E-mail "pagamento atrasado" reenviado a cada `subscription.updated`, sem guarda `*SentAt` | `apps/admin/src/app/api/webhooks/stripe-billing/route.ts:49-53` | Spam ao lojista | Mesmo padrão `updateMany` atômico de `@repo/mail` | **P** |

### Melhorias

| # | Problema | Evidência | Correção | Esf. |
|---|---|---|---|---|
| M1 | Vitrine 100% dinâmica (`force-dynamic`, zero `revalidate`/`unstable_cache`) → cada visita = 3–6 queries | `apps/storefront/src/app/layout.tsx:8` | `unstable_cache` com tag por loja em `getStoreBySlug`, categorias e home sections; `revalidateTag` nas actions do admin | **M** |
| M2 | Hero/banner/logo com `<img>` cru (LCP da home) | `components/sections/hero.tsx:12`, `banner-carousel.tsx:13`, `text-image.tsx:11,19`, `(shop)/layout.tsx:40` | `next/image` com `priority` no hero | **P** |
| M3 | Sentry recebe evento sem stack trace (`type/value` apenas) | `lib/error-reporting.ts:28` (ambas apps) | Incluir `stacktrace.frames` parseado de `error.stack` | **P** |
| M4 | Sem `error.tsx` por rota (só `global-error.tsx`) → erro de página derruba o shell | `find` em `apps/*/src/app` | `error.tsx` em `[store]/` e `(dashboard)/` | **P** |
| M5 | CI sem `yarn audit` nem build da imagem Docker | `.github/workflows/ci.yml` | Steps `yarn audit --groups dependencies` (não bloqueante) e `docker build` sem push | **P** |
| M6 | Dependências com advisories: `nodemailer@6.10.1` (10 high/32 moderate, patch ≥ 7.0.11), `zod@3.25.76` (3 high, patch só na 4.x), `postcss` via next | `yarn audit` (seção 3) | Subir nodemailer para 7.x (checar API do `createTransport`); zod 4 é migração maior — avaliar; postcss resolve com o bump do Next | **P** / **M** |
| M7 | Hardening miúdo: cookie `maintenance_access` sem `secure`; `CRON_SECRET` comparado com `===`; SSRF não cobre `100.64/10` e `::ffff:`; `fetch` de webhook sem timeout; senha mínima 8 chars | `apps/storefront/src/actions/maintenance.ts:20-25`; `api/cron/*/route.ts:13-15`; `packages/db/src/webhooks.ts:13,17,71`; `validation.ts:22,33,48` | `secure: true`; `crypto.timingSafeEqual`; faixas extras; `AbortSignal.timeout(10_000)`; mínimo 10 chars | **P** |
| M8 | CSV import numa única transação interativa (timeout padrão 5 s) | `apps/admin/src/actions/csv-import.ts:20-29` | `{ timeout: 30_000 }` ou lotes de 200 linhas | **P** |
| M9 | Rate limit da API pública em memória (reseta em deploy, por instância) — decisão documentada | `apps/storefront/src/lib/api-auth.ts:5-21`; `ROADMAP.md` Decisão F6.8 | Aceitável na Fase 0 | — |

---

## 3. Resultado da Etapa 2 (verificação de funcionamento)

Ambiente local: Windows 11, **Node v22.23.1** (CI e Dockerfile usam Node 20 — tudo passou nos dois, mas vale alinhar com `nvm`/`.nvmrc`), Yarn não instalado globalmente → rodado via `npx yarn@1.22.22`. Postgres local do Docker estava ativo (o E2E usou).

| Comando | Resultado | Tempo | Observação |
|---|---|---|---|
| `yarn install --frozen-lockfile` | **OK** | 23 s | 3 warnings de peer dependency em `@repo/ui` (`next`/`react` como peer sem versão; `next@14.2.35` puxado só como devDependency do `@repo/ui`) |
| `yarn db:generate` | **OK** | 3 s | Prisma Client 5.22.0 (aviso de major 8.0.0-rc disponível — ignorar por ora) |
| `yarn typecheck` | **OK** | 9 s | 6/6 workspaces |
| `yarn lint` | **OK** | 6 s | admin e storefront sem warnings |
| `yarn test` | **OK** | 5 s (+33 s E2E) | Vitest: `@repo/db` 115 testes, `admin` 33, `storefront` 10 (**158**). O Turbo também executou o **E2E Playwright (7/7 passaram)** porque o workspace `e2e` tem script `test` — ver I7 (quebra o job `build` do CI, que não tem Postgres). Um `Error: aborted` no log do webserver é só conexão fechada pelo teste. |
| `yarn build` | **OK** | 42 s | Storefront: 37 rotas, First Load JS compartilhado 87,1 kB, maior página `/checkout` 108 kB, middleware 27,3 kB. Admin: 48 rotas, 87,1 kB compartilhado, `/home` 103 kB, middleware 32,7 kB. Tudo `ƒ` (dinâmico). |
| `yarn audit` | **FALHOU (exit 30)** | 4 s | **88 vulnerabilidades — 4 critical, 28 high, 50 moderate, 6 low**, concentradas em 4 pacotes (abaixo). |

Resumo do `yarn audit` por pacote:

| Severidade | Pacote (instalado) | Qtde | Corrigido em | Via |
|---|---|---|---|---|
| critical | `next` 14.2.5 | 4 | ≥ 14.2.25 | dependência direta (admin, storefront) |
| high | `next` 14.2.5 | 12 | ≥ 14.2.15 | idem |
| high | `nodemailer` 6.10.1 | 10 | ≥ 7.0.11 | `@repo/mail` |
| high | `postcss` | 2 | ≥ 8.5.12 | via `next` |
| high | `zod` 3.25.76 | 3 | ≥ 4.6.6 | `@repo/db`, `@repo/mail`, apps |
| moderate | `next` | 16 | ≥ 14.2.7 | DoS em image optimization |
| moderate | `nodemailer` | 32 | ≥ 7.0.7 | addressparser |
| moderate | `postcss` | 2 | ≥ 8.5.10 | via `next` |
| low | `next` / `nodemailer` | 6 | ≥ 14.2.30 / ≥ 8.0.4 | — |

Varredura de segredos (padrões `sk_live_`, `sk_test_`, `whsec_`, `AKIA`, `re_`, `sk-ant-`, chaves privadas) em arquivos rastreados e em **todo o histórico git**: **nenhum valor real** — só o placeholder `whsec_xxx…` em `.env.example:12`. `ecommerce/.env` existe localmente (não rastreado, nunca commitado). Recomendação: gere segredos novos para produção, não copie o `.env` de dev.

---

## 4. Checklist de prontidão (resumo)

Legenda: ✅ OK · ❌ FALTA · ➖ N/A. Evidência detalhada nas tabelas da seção 2.

**Segurança**

| Item | Status | Evidência curta |
|---|---|---|
| Segredos fora do código/histórico; `.env` ignorado; `.env.example` completo | ✅ (ressalva I10) | `.gitignore:9`; `AUTH_SECRET` ≥ 32 chars exigido em `jwt.ts:13`, `customer-session.ts:13` |
| Hash de senha forte | ✅ | bcrypt custo 12 (`auth.ts:99,153,176,213`); dummy hash p/ tempo constante (`auth.ts:22,56`) |
| Cookies httpOnly/secure/sameSite; expiração | ✅ (M7) | `session.ts:8-14`, `customer-session.ts:37-43`; JWT 7 d + `sessionVersion` revalidada no banco (`session.ts:36-37`) |
| Rotas admin protegidas | ✅ (B1) | `middleware.ts:4-19` + `requireSession()` em páginas/actions/rotas |
| Autorização / IDOR | ✅ | `findFirst({ id, storeId })` antes de toda escrita (`orders.ts:16,62,77,95`, `products.ts:80`, `team.ts:62-81`…); `/api/v1/*` filtra `storeId` da chave; rastreio por `publicToken`+`storeId` |
| Validação no servidor; injection; XSS | ✅ | Zod em todas as actions; único raw SQL é `SELECT 1`; único `dangerouslySetInnerHTML` passa por `renderSafeMarkdown` (`p/[slug]/page.tsx:35`); JSON-LD escapado (`seo.ts:3`) |
| CORS restrito | ✅ | Nenhum `Access-Control-Allow-Origin` → same-origin |
| Headers de segurança / CSP / HSTS | ❌ | C2 |
| HTTPS | ➖ | Hospedagem; `COOKIE_SECURE` default `true` no compose |
| Rate limit login | ✅ | 5/15 min por e-mail em `LoginAttempt` (`auth.ts:24-46`) |
| Rate limit cadastro/reset/magic link/newsletter/avaliação/checkout | ❌ | C3 |
| Rate limit API pública / IA | ✅ (M9) | 60 req/min por chave (`api-auth.ts:5-21`); 20/dia por loja (`ai-description.ts:23-24`) |
| Upload: tipo, tamanho, destino | ✅ | magic bytes, 5 MB, só JPG/PNG/WEBP/AVIF/GIF, chave `stores/{storeId}/products/{uuid}` (`uploads.ts:7-34`); S3 |
| Webhooks de entrada: assinatura + idempotência | ✅ (I11) | corpo cru + `constructEvent` (`webhooks/stripe/route.ts:16-24`); `updateMany` condicionado em `lib/orders.ts` |
| Webhooks de saída: HMAC + anti-SSRF | ✅ (M7) | `packages/db/src/webhooks.ts:10-43,65-76` |
| Dependências vulneráveis | ❌ | B1, M6 |
| LGPD: inventário de dados | ✅ | `Customer`, `CustomerAddress`, `Order` (e-mail/nome/telefone/CPF-CNPJ/endereço), `AbandonedCart`, `Review.authorName`, `User`; `LoginAttempt` sem IP; `CookieConsentLog` anônimo |
| LGPD: política de privacidade | ❌ | C4 |
| LGPD: exportação / exclusão | ✅ parcial (I5) | só pelo lojista |
| LGPD: consentimento / retenção | ✅ / ❌ | `marketingConsentAt`, banner com log anônimo; sem expurgo (I3) |

**Confiabilidade e dados**

| Item | Status | Evidência curta |
|---|---|---|
| Migrations versionadas, sem `db push` | ✅ | 18 migrations; `db:deploy` = `migrate deploy` |
| Migrations rodam no deploy | ❌ | B3 |
| Backup automático + restauração testável | ❌ | C1 |
| Nada persistido em disco local | ✅ | grep `writeFile/mkdir/process.cwd/tmp` vazio; upload no S3 |
| Health check; erros sem stack trace | ✅ (M4) | `/api/health` `SELECT 1` → 503 (`route.ts:6-13`); `global-error.tsx:12-20` genérico |
| Configuração via env | ✅ (B2, I10) | nenhum `localhost` em `src/` |

**Escalabilidade**

| Item | Status | Evidência curta |
|---|---|---|
| Stateless | ✅ (M9) | sessão JWT; só rate limit da API e cache de domínio (TTL 60 s, `middleware.ts:5`) em memória |
| Pool de conexões | ❌ | C6 |
| N+1 / índices / paginação | ✅ (I2) | `react.cache` em `getStoreBySlug`; `skip/take` em admin e `/busca`; índices em `Order`/`Product` (`schema.prisma:373-374,623-624`) |
| Cache / CDN / bundle | ❌ / ✅ | M1; bundle 87 kB compartilhado, `standalone`, SDKs só no servidor |
| Tarefas pesadas fora da request | ❌ | I1, I4 |

**Monitoramento**

| Item | Status | Evidência curta |
|---|---|---|
| Logs estruturados sem PII | ✅ | `error-reporting.ts:9`; grep de PII em `console.*` vazio |
| Captura de erros | ✅ parcial (M3) | envelope Sentry via POST, com `SENTRY_DSN` |
| Uptime monitor | ➖ | externo (UptimeRobot) sobre `/api/health` |
| Métricas latência/erro/banco | ❌ | depende da plataforma |

**Entrega**

| Item | Status | Evidência curta |
|---|---|---|
| Dockerfile multi-stage, non-root | ✅ (I6) | `Dockerfile:6,17,25,33`; `binaryTargets` com `linux-musl-openssl-3.0.x` (`schema.prisma:3`) |
| CI build/lint/test a cada push | ✅ parcial (I7, M5) | `.github/workflows/ci.yml` — mas `main` está 27 commits atrás |
| Rollback | ❌ | I8 |

---

## 5. Comparação de opções de deploy

Câmbio usado: **PTAX venda 13/11/2026 = R$ 5,6518/US$** (BCB, API Olinda `CotacaoDolarPeriodo`, consultado 14/11/2026). Com IOF 3,5% ≈ **R$ 5,85/US$** (IOF 3,5%: fontes secundárias citando Decreto 12.499/2025 — **não verificado em fonte oficial**). Spread do cartão (~4–6 %) não incluído.

### 5.1 Preços e limites verificados (consulta 2026-11-14)

| Serviço | Plano | Preço | Limite relevante | Fonte | Status |
|---|---|---|---|---|---|
| Vercel | Hobby | US$ 0 | **ToS §4: "only … for your personal or non-commercial use"**; KB lista "processing payment" como comercial → **proibido para esta app**. Cron mín. 1×/dia, 100 GB, 1 seat | vercel.com/legal/terms · vercel.com/kb/guide/why-is-my-account-deployment-blocked · vercel.com/docs/plans/hobby | verificado |
| Vercel | Pro | **US$ 20/seat/mês** | 1 TB, cron 1×/min, wildcard suportado | vercel.com/pricing · vercel.com/docs/domains/working-with-domains | verificado |
| Render | Free web | US$ 0 | **Hiberna após 15 min; ~1 min para acordar**; 750 h/mês | render.com/docs/free | verificado |
| Render | Free Postgres | US$ 0 | 1 GB; **expira 30 dias após criação** (+14 de carência, depois apagado); sem backup | render.com/docs/free | verificado |
| Render | Starter web / Postgres Basic | ~US$ 7 / ~US$ 6 + disco | render.com/pricing é renderizado no cliente — valores de terceiros | render.com/pricing | **não verificado** |
| Render | Regiões | — | Oregon, Ohio, Virginia, Frankfurt, Singapore — **nenhuma na América do Sul** | render.com/docs/regions | verificado |
| Railway | Free / Hobby | US$ 0 (US$ 1 uso) / US$ 5 incl. US$ 5 uso | **Sem região no Brasil** (CA, VA, AMS, SG) | railway.com/pricing · docs.railway.com/reference/regions | verificado |
| Fly.io | PAYG | shared-cpu-1x **256 MB US$ 2,19 · 512 MB US$ 3,69 · 1 GB US$ 6,70**/mês (preço iad); egress AmSul US$ 0,04/GB; **sem free tier** (trial US$ 1/7 dias) | docs.fly.io/about/pricing | verificado (preço de `gru`: **não verificado** — tabela client-side) |
| Fly.io | Região `gru` | — | "Sao Paulo, Brazil" listada | docs.fly.io/reference/regions | verificado |
| Cloudflare Workers | Free | US$ 0 | 10 ms CPU/invocação — **inviável para SSR Next.js 14**; OpenNext é port comunitário | developers.cloudflare.com/workers/platform/limits | verificado |
| Cloudflare | Free (DNS/CDN/SSL/DDoS) | US$ 0 | Wildcard DNS proxiado em todos os planos | cloudflare.com/plans/free · developers.cloudflare.com/dns/…/wildcard-dns-records | verificado |
| Cloudflare R2 | Free | US$ 0 | **10 GB-mês, 1 M Class A, 10 M Class B, egress grátis**; depois US$ 0,015/GB | developers.cloudflare.com/r2/pricing | verificado |
| Backblaze B2 | PAYG | 10 GB grátis; US$ 6,95/TB | egress grátis até 3× storage | backblaze.com/cloud-storage/pricing | verificado |
| Neon | Free | US$ 0 | **1 GB/projeto, 100 CU-h/mês** (0,25 CU ≈ 400 h), scale-to-zero após 5 min, restore 6 h, **suspende em vez de cobrar**; **região `aws-sa-east-1` (São Paulo)** | neon.com/pricing · neon.com/docs/introduction/regions | verificado |
| Neon | Launch | uso: US$ 0,106/CU-h + US$ 0,35/GB-mês | ≈ US$ 15/mês em carga intermitente | neon.com/pricing | verificado |
| Supabase | Free / Pro | US$ 0 / **US$ 25** | Free: 500 MB, **pausa após 7 dias sem atividade**, sem backup; `sa-east-1` existe | supabase.com/pricing · supabase.com/docs/guides/platform/regions | verificado |
| Prisma Postgres | Free | US$ 0 | 200 k ops/mês, 2 GB, sem backup | prisma.io/pricing | verificado (região: não) |
| Resend | Free | US$ 0 | **3.000/mês, 100/dia**, 3 domínios | resend.com/pricing | verificado |
| Brevo | Free | US$ 0 | 300/dia | brevo.com/free-smtp-server | verificado |
| SMTP2GO | Free | US$ 0 | 1.000/mês | smtp2go.com/pricing | verificado |
| Amazon SES | PAYG | US$ 0,10/1.000 | free tier permanente de 3.000/mês **não existe mais** | aws.amazon.com/ses/pricing | verificado |
| Sentry | Developer | US$ 0 | 5 k erros/mês, 1 usuário, 1 uptime + 1 cron monitor | sentry.io/pricing | verificado |
| GlitchTip | Free | US$ 0 | 1.000 eventos/mês | glitchtip.com/pricing | verificado |
| UptimeRobot | Free | € 0 | 50 monitores, 5 min | uptimerobot.com/pricing | verificado |
| Better Stack | Free | US$ 0 | 10 monitores, 3 min | betterstack.com/uptime/pricing | verificado |
| cron-job.org | Free | € 0 | ilimitado, até 1×/min, **timeout 30 s** | cron-job.org/en/faq | verificado |
| GitHub Actions | Free | US$ 0 | US$ 12/mês de crédito ≈ 2.000 min Linux (repo privado); `schedule` mín. 5 min, pode atrasar | docs.github.com/…/about-billing-for-github-actions | verificado |
| Hostinger VPS BR | KVM 1 / KVM 2 | **R$ 29,99 / R$ 42,99 promo (24 meses à vista = R$ 719,76 / R$ 1.031,76)**, renova R$ 59,99 / R$ 77,99 | 1 vCPU 4 GB / 2 vCPU 8 GB; DC São Paulo | hostinger.com/br/vps · hostinger.com/blog/brazilian-vps-data-center | verificado (promo) |
| Vultr | 1 vCPU 1 GB São Paulo | ≈ US$ 7,50 | site retornou 403 | vultr.com/pricing | **não verificado** |
| Akamai/Linode | Nanode 1 GB | US$ 5 | região **br-gru** existe | akamai.com/cloud/pricing · akamai.com/…/availability | verificado |
| DigitalOcean / Hetzner / Contabo | — | US$ 4 / € 5,49 / ~€ 4,40 | **sem região no Brasil** | sites oficiais | verificado |
| Oracle Cloud | Always Free | US$ 0 | **A1: 2 OCPU + 12 GB total** (não mais 4/24); 2× E2.1.Micro; só na home region (`sa-saopaulo-1` ao cadastrar); **reclamação por ociosidade**: 7 dias com CPU/rede/RAM p95 < 20 % | docs.oracle.com/…/freetier_topic-Always_Free_Resources.htm · …/regions.htm | verificado |
| Coolify / Dokploy | self-hosted | **grátis, open-source** | — | coolify.io/pricing · docs.dokploy.com | verificado |
| Registro.br | `.com.br` | **R$ 40/ano** (R$ 76 por 2 anos) | página oficial vazia (JS); valor de blogs out–nov/2026 | registro.br/dominio/preco | **não verificado** |

### 5.2 As três arquiteturas (R$ a 5,85; domínio ≈ R$ 3,30/mês em todas)

| Critério | **A) PaaS gerenciado** — Vercel Pro (2 projetos) + Neon Free sa-east-1 + R2 + Resend + Sentry/UptimeRobot | **A') Variante Render** — 2× Starter + Postgres pago + R2 + Resend | **B) VPS São Paulo + Coolify/Dokploy** — Oracle Always Free (R$ 0) ou Hostinger KVM 1, apps + Postgres no mesmo host, Cloudflare na frente, R2 p/ imagens | **C) Híbrido barato por camada** — Fly.io `gru` 2× shared-cpu-1x 512 MB + Neon Free sa-east-1 + R2 + Resend + Sentry + UptimeRobot + cron-job.org |
|---|---|---|---|---|
| **Custo agora (~50 users/dia)** | US$ 20 → **≈ R$ 120/mês** (estoura o teto) | ≈ US$ 20 → **≈ R$ 122** (não verificado) | **R$ 0** (Oracle) ou **R$ 29,99/mês** mas **R$ 719,76 à vista** (Hostinger) | US$ 7,38 → **≈ R$ 45–55/mês** |
| **Custo a 10× (~500 users/dia)** | + Neon Launch ~US$ 15 → **≈ R$ 205** | **≈ R$ 160** | **igual** (KVM 1 aguenta; renovação R$ 59,99 após 24 m) | 2× 1 GB US$ 13,40 + Neon Launch ~US$ 15 → **≈ R$ 165** (ou mover o Postgres para uma máquina Fly e ficar em ~R$ 80) |
| **O que o free tier NÃO cobre** | **Hobby proíbe uso comercial** → Pro desde o dia 1; Neon Free suspende se passar de 100 CU-h, restore só 6 h | Free web **hiberna 15 min → webhook/checkout esperam ~1 min**; Free Postgres **morre em 30 dias** | Oracle: **instância reclamada se ociosa** (p95 < 20 % por 7 dias — exatamente o perfil de 50 users/dia), cota A1 reduzida; Hostinger: promo só com 24 meses à vista | Fly **sem free tier**; Neon Free idem A; cron-job.org timeout 30 s (ok se os crons forem limitados — I2) |
| **Latência p/ Brasil** | CDN BR, mas functions por padrão nos EUA (`iad`) — configurar `gru1` (**não verificado** se disponível), senão cada query cruza o oceano | **Sem região BR** (~120–180 ms, não medido) | **Mínima** — tudo em São Paulo | Boa — Fly `gru` + Neon sa-east-1 |
| **Segurança incluída** | HTTPS, DDoS, WAF básico; backup Neon 6 h | HTTPS, DDoS; backup do Postgres pago (não verificado) | HTTPS via Traefik/Let's Encrypt; **DDoS/WAF só pelo Cloudflare**; firewall + ufw; **backup é seu** | HTTPS, firewall por app; backup Neon 6 h (+ C1) |
| **Monitoramento incluído** | Logs 1 dia, Analytics | Logs/métricas básicas | Coolify: logs/health; resto externo | Logs + Grafana do Fly; resto externo |
| **Manutenção (h/mês)** | **~0,5–1 h** | ~1 h | **~3–5 h** (SO, Coolify, disco, Postgres, teste de restore) | **~1–2 h** |
| **Dificuldade de migrar depois** | Baixa | Baixa | Baixa (app) / média (banco: dump/restore manual) | Baixa |
| **Compatível com o código hoje** | Sim (`lib/hosting.ts` já fala com a API da Vercel); I10 precisa de ajuste | Sim (Docker) | Sim (Docker/compose, com C5) | Sim (Docker); `lib/hosting.ts` vira no-op documentado |

Pegadinhas cruzadas:
- **Webhook do Stripe × hibernação:** Render Free (~1 min) é inaceitável para checkout. Neon scale-to-zero acorda em centenas de ms — aceitável. Nunca servir checkout/webhook de instância que hiberna.
- **Vercel Hobby = proibido** (ToS + KB citam "processing payment"). Pro (US$ 20) é o mínimo legal → 120 % do teto. Hobby **só** seria defensável como ambiente de preview com Stripe em modo teste, sem clientes reais — e mesmo assim é zona cinzenta.
- **Supabase Free pausa em 7 dias sem atividade** e não tem backup — descartado.
- **Oracle Always Free** é o único R$ 0 real, mas a política de reclamação por ociosidade pega exatamente um site com 50 users/dia; há relatos de instâncias desligadas sem reativação. Não é base para produto comercial sem plano B.
- **Subdomínio curinga (`*.dominio`)**: Vercel suporta com nameservers na Vercel; Cloudflare proxia wildcard em todos os planos; Fly emite certificado wildcard via DNS-01 (`fly certs add "*.dominio"` + CNAME `_acme-challenge`) — **verificar na doc antes de contar com isso**. `customDomain` por loja exige certificado por domínio em qualquer opção (Fly: `fly certs add` por domínio — manual ou via API).

---

## 6. Recomendação

### Opção escolhida: **C) Fly.io `gru` + Neon Free `sa-east-1` + Cloudflare R2 + Resend + Sentry + UptimeRobot + cron-job.org**

Por quê, em poucas linhas: é a única combinação que (1) **não hiberna** no caminho do checkout/webhook, (2) tem **tudo em São Paulo**, (3) **cabe no teto** (~R$ 50/mês) com folga para crescer, (4) usa o **Dockerfile que já existe** sem port, (5) exige ~1–2 h/mês de manutenção, e (6) sai fácil depois (Postgres e S3 padrão, imagem Docker). Vercel só volta a fazer sentido quando a receita pagar os US$ 20 do Pro (e aí `lib/hosting.ts` já está pronto). O R$ 0 absoluto (Oracle) existe, mas com risco de a máquina sumir — se você aceitar esse risco conscientemente, a opção B com Dokploy no Oracle `sa-saopaulo-1` é o plano "zero" e os passos de app são os mesmos.

### Plano em fases

| Fase | Quando | Infra | Custo/mês | Gatilho para a próxima |
|---|---|---|---|---|
| **0 — Lançar (2 meses, sem receita)** | agora | Fly `gru`: storefront 512 MB **sempre ligado** (webhook), admin 512 MB com `auto_stop_machines` (acorda em segundos); Neon Free sa-east-1 (DB direta, `connection_limit=5`); R2 Free com domínio público; Resend Free (100/dia); Sentry Developer; UptimeRobot (5 min em `/api/health` dos dois apps); cron-job.org → `/api/cron/*` 1×/h; GitHub Actions `schedule` diário → `pg_dump` → R2; Cloudflare DNS Free; `ALLOW_REGISTRATION=false` | **≈ R$ 45–55** (US$ 7,38 + IOF) | Primeiro lojista externo querendo pagar **ou** Neon passando de 70 CU-h/mês **ou** > 80 e-mails/dia |
| **1 — Primeiro cliente pagante** | receita > R$ 100/mês | + Stripe Connect (B4) antes de abrir cadastro; Neon Launch (~US$ 15, restore 7 dias) **ou** Postgres numa máquina Fly com volume (US$ ~7) + backup diário; Resend Pro se > 100/dia; Fly 1 GB se p95 > 1 s | **≈ R$ 100–165** | > 500 users/dia, ou lojista reclamando de lentidão, ou banco > 1 GB |
| **2 — Crescimento** | 10×+ | Avaliar Vercel Pro para os apps (domínio próprio automático via `lib/hosting.ts`, CDN, ISR com M1) mantendo Neon; ou 2 máquinas Fly por app; cache M1; fila para e-mail/webhooks (I1, I4) | **R$ 200+** | — |

### Custo estimado dos 2 primeiros meses

| Item | Valor |
|---|---|
| Fly.io 2× shared-cpu-1x 512 MB × 2 meses (preço iad; `gru` pode ser maior — não verificado) | US$ 14,76 ≈ **R$ 86** |
| Neon Free, R2 Free, Resend Free, Sentry Dev, UptimeRobot Free, cron-job.org, GitHub Actions, Cloudflare Free | **R$ 0** |
| Domínio `.com.br` (Registro.br, 1 ano — não verificado) | **R$ 40** |
| **Total 2 meses** | **≈ R$ 126** (≈ R$ 63/mês) + taxas do Stripe por transação |

### Alertas de cobrança e limites a configurar

| Serviço | O que fazer |
|---|---|
| Fly.io | Não tem teto rígido de gasto (não verificado se há "spend limit") → **não** escalar automaticamente (`max_machines_running = 1` por app); conferir fatura na 1ª semana; cartão com limite baixo ou virtual |
| Neon Free | Suspende em vez de cobrar — seguro. Ativar e-mail de "compute hours > 70 %" no console |
| Cloudflare R2 | Free não cobra até 10 GB; ativar **Billing notifications** no dashboard (não verificado se existe teto rígido) |
| Resend | Hard cap 100/dia (rejeita, não cobra); monitorar no dashboard |
| Sentry | Hard cap 5 k/mês (descarta eventos); desativar "on-demand budget" |
| UptimeRobot / cron-job.org / GitHub Actions | Gratuitos sem cartão; GitHub avisa ao atingir 75/90/100 % dos minutos |
| Stripe | Modo **live** só depois de B4 resolvido; ativar Radar padrão; e-mail de webhook falhando (Dashboard → Developers → Webhooks) |

---

## 7. Passo a passo do deploy recomendado (Fly.io + Neon + R2)

Pré-requisitos no código (fazer **antes**): B1, B2, B3, B4 (`ALLOW_REGISTRATION=false`), C1, C2, C4, C6, I6, I7. Os demais podem entrar na 1ª semana.

1. **Contas** (todas sem cobrança inicial): Fly.io (`flyctl auth signup`, pede cartão), Neon, Cloudflare (DNS + R2), Resend, Sentry, UptimeRobot, cron-job.org. Registrar o domínio no Registro.br e apontar os nameservers para o Cloudflare.
2. **Neon**: criar projeto em `aws-sa-east-1`, Postgres 16 (casa com o `pg_dump` do runner do GitHub); copiar a **connection string direta** (não pooled) e acrescentar `?sslmode=require&connection_limit=5`.
3. **R2**: criar bucket `vitrine-media`, ativar acesso público via domínio próprio (ex. `media.seudominio.com.br`) ou `r2.dev`; criar token de API com escopo só nesse bucket. Variáveis: `S3_REGION=auto`, `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `S3_FORCE_PATH_STYLE=true`, `S3_INIT_BUCKET=false`, `S3_PUBLIC_URL=https://media.seudominio.com.br`.
4. **Resend**: verificar o domínio (SPF/DKIM no Cloudflare); SMTP `smtp.resend.com:465`, `SMTP_SECURE=true`, `SMTP_USER=resend`.
5. **Fly — storefront**: em `ecommerce/`, `fly launch --no-deploy --name <app>-storefront --region gru --dockerfile Dockerfile --build-arg APP=storefront` e editar o `fly.toml` gerado: `[build.args] APP="storefront" S3_PUBLIC_URL="https://media…"` (B2), `[http_service] internal_port=3000 force_https=true auto_stop_machines="off" min_machines_running=1`, `[[vm]] size="shared-cpu-1x" memory="512mb"`, `[deploy] release_command="yarn workspace @repo/db db:deploy"` (B3 — exige que a imagem de release tenha o Prisma CLI; a forma mais simples é um stage `migrate` no Dockerfile baseado no `builder`, ou `prisma` como dependência do runner). `fly secrets set` com as variáveis da seção 8. `fly deploy`.
6. **Fly — admin**: idem com `APP=admin`, `internal_port=3001` (o Dockerfile usa `PORT`; setar `[env] PORT="3001"`), `auto_stop_machines="stop"`, `min_machines_running=0`. **Não** colocar `release_command` no admin (uma migration por deploy basta).
7. **Domínios**: Cloudflare DNS → `A/AAAA` (ou CNAME) `loja.seudominio.com.br` → storefront, `painel.seudominio.com.br` → admin, `*.seudominio.com.br` → storefront (`STOREFRONT_ROOT_DOMAIN`). `fly certs add` para cada um (wildcard via `_acme-challenge` CNAME — conferir na doc). Deixar o Cloudflare em **DNS only** (nuvem cinza) até os certificados do Fly saírem; depois pode proxiar (Full strict).
8. **Stripe**: endpoints `https://loja…/api/webhooks/stripe` (eventos `checkout.session.*`) e `https://painel…/api/webhooks/stripe-billing`; copiar os `whsec_` para os secrets. Testar com `scripts/test-webhook.mjs` apontando para a URL pública antes de ligar o modo live.
9. **Seed/primeiro lojista**: **não** rodar o seed em produção (C5). Criar o lojista via `/register` com `ALLOW_REGISTRATION=true` **por 10 minutos**, depois voltar para `false` (`fly secrets set ALLOW_REGISTRATION=false`), ou um script one-off `fly ssh console`.
10. **Cron**: cron-job.org → `GET https://loja…/api/cron/abandoned-carts` e `/api/cron/review-requests` a cada hora com header `Authorization: Bearer <CRON_SECRET>`; alerta por e-mail em falha.
11. **Backup** (C1): workflow `.github/workflows/backup.yml` com `schedule: "0 6 * * *"`, instala `postgresql-client-16`, `pg_dump "$DATABASE_URL" | gzip > dump.sql.gz`, `aws s3 cp` para um bucket R2 **privado** (`backups/`), com `DATABASE_URL` e credenciais R2 em GitHub Secrets. **Testar restore** uma vez num branch Neon.
12. **Monitoramento**: UptimeRobot em `/api/health` dos dois apps (5 min, alerta por e-mail); `SENTRY_DSN` nos dois apps; conferir que um erro proposital chega no Sentry.
13. **Rollback**: `fly releases` lista as versões; `fly deploy --image <registry.fly.io/app:deployment-xxxx>` volta para a anterior. Migrations são só aditivas até aqui — nunca fazer rollback de migration em produção; escrever migrations compatíveis com a versão anterior do app.

### Checklist pós-deploy (30 min)

- [ ] `/api/health` 200 nos dois apps; UptimeRobot verde.
- [ ] Criar produto com foto no admin → aparece na vitrine com a imagem do R2.
- [ ] Checkout em modo teste → webhook marca `PAID` → e-mail chega (Resend logs).
- [ ] `fly logs` sem erro; evento de teste no Sentry.
- [ ] Headers: `curl -I https://painel…` mostra `X-Frame-Options`, `Strict-Transport-Security`, sem `X-Powered-By`.
- [ ] `ALLOW_REGISTRATION=false` confirmado em `/register`.

---

## 8. Variáveis de ambiente necessárias (só nomes)

**Storefront** (`fly secrets set` / build arg onde indicado)

`DATABASE_URL` · `AUTH_SECRET` · `COOKIE_SECURE=true` · `STOREFRONT_URL` · `STOREFRONT_ROOT_DOMAIN` · `STOREFRONT_INTERNAL_URL` (= URL pública do storefront, I10) · `ADMIN_URL` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `CRON_SECRET` · `REVIEW_REQUEST_DAYS_AFTER_DELIVERY` · `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASSWORD` · `MAIL_FROM` · `SENTRY_DSN` · **`S3_PUBLIC_URL` (também como `--build-arg`, B2)**

**Admin**

`DATABASE_URL` · `AUTH_SECRET` (mesmo valor do storefront) · `COOKIE_SECURE=true` · `ALLOW_REGISTRATION=false` · `PORT=3001` · `STOREFRONT_URL` · `ADMIN_URL` · `S3_REGION` · `S3_ENDPOINT` · `S3_FORCE_PATH_STYLE` · `S3_INIT_BUCKET=false` · `S3_BUCKET` · `S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY` · `S3_PUBLIC_URL` · `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASSWORD` · `MAIL_FROM` · `STRIPE_SECRET_KEY` · `STRIPE_BILLING_WEBHOOK_SECRET` · `STRIPE_PRICE_ESSENCIAL` · `STRIPE_PRICE_PRO` · `SENTRY_DSN` · opcionais: `ANTHROPIC_API_KEY` · `ANTHROPIC_MODEL` · `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` (deixar vazios fora da Vercel — `lib/hosting.ts` vira no-op)

**Não definir em produção:** `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `POSTGRES_*` (só o compose de dev usa).

**GitHub Secrets (backup):** `BACKUP_DATABASE_URL` · `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BACKUP_BUCKET`.

Gere `AUTH_SECRET` e `CRON_SECRET` novos (`openssl rand -base64 32`); não reutilize nada do `.env` de desenvolvimento.

---

## 9. Itens não verificados / perguntas em aberto

- Preço das máquinas Fly na região `gru` (tabela só mostra `iad`); se houver sobretaxa, Akamai/Linode `br-gru` Nanode (US$ 5, verificado) com Dokploy é o plano B dentro do teto.
- Preços pagos do Render; Vultr São Paulo; Registro.br R$ 40; texto oficial do IOF 3,5 %; disponibilidade de `gru1` na Vercel; certificado wildcard no Fly.
- **Decisão sua (B4):** na Fase 0 as lojas são só suas (travar cadastro e seguir) ou já haverá lojista externo (então Stripe Connect vira pré-requisito do lançamento)?
- **Confirmar premissas** dos colchetes: teto R$ 100, 50 users/dia, 2 h/semana.

---

## 10. Ordem sugerida de correção

Critérios, nesta ordem: (1) o que destrava o resto (CI verde antes de mexer em dependências); (2) bloqueadores; (3) o que precisa estar certo **antes** de existir dado real (segurança, LGPD, backup); (4) o resto. Itens que mexem no mesmo arquivo ficam no mesmo commit; mudanças de schema ficam numa migration só. Cada lote fecha com `yarn typecheck && yarn lint && yarn test && yarn build && yarn e2e`.

### Lote 0 — Decisão (sem código)
| Ordem | Item | Por quê agora |
|---|---|---|
| 0.1 | **B4 — decidir**: Fase 0 só com lojas suas, ou com lojista externo? | Se houver lojista externo, Stripe Connect (G) vira pré-requisito e muda o cronograma inteiro |

### Lote 1 — Destravar CI e a base (≈ 2–3 h)
| Ordem | Item | Esf. | Observação |
|---|---|---|---|
| 1.1 | **I7** — tirar o E2E do `turbo run test` + abrir PR da branch para `main` | P | Sem isso o CI fica vermelho e nada das Fases 2–6 é validado; todo lote seguinte depende de CI confiável |
| 1.2 | **B1** — Next.js para a última 14.2.x (resolve também os `postcss` do audit) | P | Primeiro bump isolado, com E2E, pra saber que nada quebrou antes de mexer no resto |
| 1.3 | **I6** — `yarn.lock` obrigatório + `--frozen-lockfile` no Dockerfile | P | Mesmo arquivo do 1.4/1.5 |
| 1.4 | **B2** — `S3_PUBLIC_URL` como `ARG`/`ENV` no stage `builder` | P | Mesmo commit do Dockerfile |
| 1.5 | **B3** — stage `migrate` no Dockerfile (ou Prisma CLI no runner) para o `release_command` | P | Idem |
| 1.6 | **C5** — seed só com `RUN_SEED=true`; `SEED_ADMIN_*` vazios no exemplo; `ports` em `127.0.0.1` | P | `docker-compose.yml` + `.env.example` juntos |
| 1.7 | **B4 (parte P)** — `ALLOW_REGISTRATION` default `false` no `.env.example` e no compose | P | Mesmo commit do 1.6 |
| 1.8 | **I10** — `STOREFRONT_INTERNAL_URL` no `.env.example` | P | Mesmo commit do 1.6 |

### Lote 2 — Segurança e LGPD antes de dado real (≈ ½ dia)
| Ordem | Item | Esf. | Observação |
|---|---|---|---|
| 2.1 | **C2** — headers de segurança + `poweredByHeader: false` (CSP em `Report-Only`) | P | Só `next.config.mjs` das duas apps |
| 2.2 | **C4** — política de privacidade-modelo + aviso no admin | P | Lojas novas já nascem com ela; loja-demo precisa ser atualizada à mão |
| 2.3 | **C6** — `connection_limit` / orientação de pooler documentada | P | Precisa estar decidido antes de criar o banco no Neon |
| 2.4 | **M7** — hardening miúdo (cookie `secure`, `timingSafeEqual`, faixas SSRF, timeout de fetch, senha 10+) | P | Arquivos pequenos e independentes |
| 2.5 | **I11** — guarda `*SentAt` no e-mail de pagamento atrasado | P | Se precisar de campo novo, juntar na migration do 3.2 |

### Lote 3 — Operação e robustez (≈ 1 dia)
| Ordem | Item | Esf. | Observação |
|---|---|---|---|
| 3.1 | **I1 + M6 (nodemailer)** — timeouts/`pool` no `createTransport` e nodemailer 7.x | P | Mesmo arquivo (`packages/mail/src/transport.ts`) |
| 3.2 | **I2 + I3** — limites nos crons, índices novos e `/api/cron/cleanup` | P | **Uma migration** para todos os índices |
| 3.3 | **C3** — rate limit nos 6 endpoints (padrão `LoginAttempt`) | M | Se precisar de tabela nova, migration própria; maior item antes do deploy |
| 3.4 | **C1** — workflow de backup diário → R2 privado | P/M | Só dá pra testar o restore depois que o Neon existir — testar no passo 5.2 |

### Lote 4 — Deploy (seção 7)
Seguir o passo a passo da seção 7 com Stripe em **modo teste**; checklist pós-deploy.

### Lote 5 — Primeira semana no ar
| Ordem | Item | Esf. |
|---|---|---|
| 5.1 | **I8** — tag imutável por commit + rollback documentado | P |
| 5.2 | **C1 (restore)** — restaurar o último backup num branch Neon e anotar | P |
| 5.3 | **M4** — `error.tsx` em `[store]/` e `(dashboard)/` | P |
| 5.4 | **M3** — stack trace no envelope do Sentry | P |
| 5.5 | **M5** — `yarn audit` e `docker build` no CI | P |
| 5.6 | **I9** — corrigir README/CLAUDE.md | P |
| 5.7 | Stripe em **modo live** | — |

### Lote 6 — Quando der (antes de crescer)
| Ordem | Item | Esf. | Gatilho |
|---|---|---|---|
| 6.1 | **B4 (Stripe Connect)** | G | Antes do primeiro lojista externo |
| 6.2 | **I5** — autoatendimento LGPD na conta do cliente | M | Antes de abrir cadastro público |
| 6.3 | **M2** — `next/image` no hero/banner | P | Junto com qualquer mexida na home |
| 6.4 | **M8** — timeout/lotes no import de CSV | P | Primeiro lojista com catálogo grande |
| 6.5 | **M1** — cache por loja na vitrine | M | > 500 users/dia ou Neon perto de 70 CU-h |
| 6.6 | **I4** — fila durável para webhooks de saída | M | Primeiro cliente usando a API/webhooks |
| 6.7 | **M6 (zod 4)** | M | Janela sem urgência; migração de API |

---

## 11. Status das correções (atualizado em 2026-11-15)

Branch `fix/deploy-lote-1`. Cada lote passou por typecheck, lint, testes unitários, build e E2E antes do commit.

| Lote | Commit | Itens |
|---|---|---|
| 1 | `d72238e` | B1 (Next 14.2.35), B2, B3, C5 (seed opcional), B4 (cadastro fechado), I6, I7, I10 |
| 1b | `3598ac3` | **Next 15.5.29 + React 19** — a linha 14.2 não corrige 2 RCEs críticos (fecha o B1) |
| 2 | `0bd6418` | C2, C4, C6, M7, I11 |
| 3 | `5870573` | C3 (rate limit), I2, I3 (`/api/cron/cleanup`), I1 + nodemailer 10, C1 (workflow de backup), postcss |
| 4 | `b458051` | `fly.storefront.toml` / `fly.admin.toml`, I8 (tag pelo commit + rollback) |
| 5 | `76b7634` | M3, M4, M5 (audit + Docker no CI), I9 |
| 6 | (este) | I5 (LGPD pelo titular), M2, M8, M6 (zod 4) |

`yarn audit`: **88 → 0** vulnerabilidades.

**Mudanças em relação ao plano**
- C5: o bind das portas em `127.0.0.1` foi revertido — quebrava `localhost` → `::1` no Windows (e2e com timeout). Ficou um aviso no compose/README; produção (Fly) não usa o compose.
- M2: as imagens das seções são URLs livres (qualquer domínio) e o hero usa `<picture>` com imagem mobile; `next/image` quebraria imagens externas. Feito com `fetchPriority="high"` no hero e `loading="lazy"` no resto.

**Pendente — decisão sua ou ação fora do código**
- **B4 / F1.4 — recebimento por loja (pré-requisito do lançamento com lojista externo).** O ROADMAP marca como **Decisão** (Stripe Connect × Mercado Pago). Existe a branch `origin/feat/f1-4-recebimento-por-loja` com Stripe Connect (onboarding + checkout), feita sobre um ponto anterior às Fases 2–6 (29 commits atrás); portar exige refazer a integração no checkout atual.
- **Deploy (Lote 4):** contas, secrets, DNS e o primeiro `fly deploy` são seus; depois, testar a restauração do backup (5.2) e só então Stripe em modo live (5.7).
- **Não feitos de propósito (gatilho ainda não atingido):**
  - M1 (cache da vitrine): admin e vitrine são processos separados, então invalidar cache ao salvar no admin exige um endpoint de revalidação na vitrine; cache por tempo (TTL) mostraria mudanças com atraso (inclusive "loja em construção"). Gatilho: > 500 usuários/dia ou Neon perto de 70 CU-h.
  - I4 (fila durável de webhooks de saída): no Fly a máquina é persistente, então as 3 tentativas em processo funcionam; só se perdem num restart no meio. Decisão já registrada no ROADMAP (F6.8). Gatilho: primeiro cliente integrando via API/webhooks.
