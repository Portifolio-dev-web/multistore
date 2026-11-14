# Vitrine Commerce — e-commerce white-label (multi-loja)

Monorepo **Turborepo** com duas aplicações Next.js 14 (App Router) isoladas e pacotes compartilhados (Prisma, e-mail). Cada loja (`Store`) tem seu próprio slug, tema e dados, servida a partir do mesmo deploy.

## Stack

- **Next.js 14** (App Router, Server Actions) + **React 18** + **TypeScript** — `apps/storefront` e `apps/admin`.
- **Tailwind CSS 3** para estilo; tema por loja via CSS variables (`--brand`, `--accent`).
- **Prisma 5** + **PostgreSQL 16** — `packages/db`, schema único compartilhado pelas duas apps.
- **Stripe** (`stripe` SDK) — checkout da vitrine e webhooks (pagamento + Stripe Billing para assinatura dos lojistas).
- **Nodemailer** — `packages/mail`, e-mails transacionais (SMTP, Mailpit em dev).
- **Zod** — validação de input em Server Actions e rotas de API.
- **Zustand** — carrinho do storefront (persistido em localStorage, por loja).
- **Turborepo** + **Yarn Classic (workspaces)** — build/cache incremental do monorepo.
- **Playwright** — testes E2E (`e2e/`); **Vitest** — testes unitários por workspace.
- **Docker** / **docker-compose** — Postgres, storage S3-compatível (RustFS), Mailpit, Stripe CLI e as duas apps.
- **AWS SDK (S3)** — upload de imagens de produto (compatível com S3, R2, RustFS).
- **Anthropic SDK** — geração assistida de descrição de produto no admin (opcional).

## Estrutura do repositório

```
.
├── apps/
│   ├── storefront/      # Área do cliente (porta 3000) — vitrine, carrinho, checkout, webhooks Stripe
│   └── admin/           # Painel do lojista (porta 3001) — catálogo, pedidos, equipe, planos, domínio
├── packages/
│   ├── db/              # Prisma schema + client + utils compartilhados (preços, permissões, planos)
│   │   ├── prisma/schema.prisma
│   │   └── prisma/seed.ts
│   └── mail/            # Envio de e-mail transacional (nodemailer) usado por admin e storefront
├── e2e/                 # Suíte Playwright (admin, storefront, webhook, reserva de estoque)
├── scripts/             # test-webhook.mjs, backup-db.sh, restore-db.sh, storage-init.mjs
├── Dockerfile           # único, parametrizado por --build-arg APP
├── docker-compose.yml
└── .env.example
```

## Pré-requisitos

| Ferramenta | Versão recomendada | Observação |
|---|---|---|
| Node.js | 20.x (LTS) | mesma versão usada no CI (`.github/workflows/ci.yml`) |
| Yarn | Classic 1.22.x | `packageManager` fixado em `package.json`; não usar Yarn Berry |
| Docker / Docker Compose | recente (v2) | para Postgres, storage S3 e Mailpit locais |
| PostgreSQL | 16 | via Docker (`postgres:16-alpine`) ou instância própria |
| Conta Stripe | — | modo teste é suficiente; chave `sk_test_...` e Stripe CLI para webhooks locais |
| Playwright browsers | — | `npx playwright install chromium`, uma vez por máquina |

## Subindo com Docker

```bash
cp .env.example .env        # preencha STRIPE_SECRET_KEY e AUTH_SECRET (openssl rand -base64 32)
docker compose up --build
```

O serviço `migrate` aplica as migrations (`prisma migrate deploy`) e roda o seed (loja `loja-demo` + lojista definido em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Depois sobem:

| Serviço    | URL                              |
|------------|----------------------------------|
| Storefront | http://localhost:3000            |
| Admin      | http://localhost:3001            |
| Postgres   | localhost:5432                   |

### Webhooks do Stripe em desenvolvimento

```bash
docker compose --profile stripe up
```

O container `stripe-cli` encaminha os eventos para `storefront:3000/api/webhooks/stripe`. Copie o `whsec_...` exibido no log para `STRIPE_WEBHOOK_SECRET` no `.env` e reinicie o storefront (`docker compose up -d storefront`).
Em produção: crie o endpoint `https://SEU_DOMINIO/api/webhooks/stripe` no Dashboard do Stripe com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`.

Cartão de teste: `4242 4242 4242 4242`, qualquer validade futura e qualquer CVC.

### Stripe Billing (assinatura dos lojistas — F6.3, opcional)

Produto separado dentro da mesma conta Stripe: crie dois preços recorrentes (Essencial/Pro) e um
endpoint de webhook próprio `https://SEU_DOMINIO_ADMIN/api/webhooks/stripe-billing` com os eventos
`checkout.session.completed`, `customer.subscription.updated` e `customer.subscription.deleted`.
Em dev: `stripe listen --forward-to localhost:3001/api/webhooks/stripe-billing`.

## Variáveis de ambiente

| Variável                | App         | Descrição |
|-------------------------|-------------|-----------|
| `DATABASE_URL`          | todas       | Conexão PostgreSQL |
| `STRIPE_SECRET_KEY`     | storefront  | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | storefront  | Segredo de assinatura do webhook |
| `STOREFRONT_URL`        | storefront/admin | URL pública da vitrine (URLs de retorno do Stripe e link "Ver vitrine") |
| `AUTH_SECRET`           | admin/storefront | Segredo do JWT da sessão do lojista e do cliente (mín. 32 caracteres) |
| `COOKIE_SECURE`         | admin/storefront | `false` para http://localhost; `true` em produção (https) |
| `ALLOW_REGISTRATION`    | admin       | `false` desativa o cadastro de novos lojistas |
| `ANTHROPIC_API_KEY`     | admin       | Chave da API da Anthropic; sem ela, o botão "Gerar com IA" fica escondido |
| `ANTHROPIC_MODEL`       | admin       | Modelo usado para gerar descrição de produto (padrão: `claude-haiku-5-5`) |
| `CRON_SECRET`           | storefront  | Protege `/api/cron/*` (carrinho abandonado, pedido de avaliação); sem ela, os dois recusam a chamada |
| `REVIEW_REQUEST_DAYS_AFTER_DELIVERY` | storefront | Dias após a entrega pra mandar o e-mail pedindo avaliação (padrão: 7) |
| `ADMIN_URL`              | storefront/admin | URL do painel do lojista — link do e-mail de aviso de nova venda (storefront) e links dos próprios e-mails do admin: redefinir senha, verificar e-mail, convite de equipe (padrão: `http://localhost:3001`) |
| `STRIPE_PRICE_ESSENCIAL` / `STRIPE_PRICE_PRO` | admin | IDs de preço recorrente do Stripe Billing para os planos pagos (F6.3); sem eles, o upgrade mostra um aviso |
| `STRIPE_BILLING_WEBHOOK_SECRET` | admin | Segredo do webhook de assinatura (`/api/webhooks/stripe-billing`) — endpoint separado do checkout da vitrine |
| `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` | admin | API de domínios da hospedagem (F6.5) — sem elas, verificar um domínio só marca como verificado no banco, sem adicioná-lo a nenhum projeto |
| `SENTRY_DSN`            | admin/storefront | Captura de erros (F6.10) — sem ela, erros só vão pro console estruturado |

## Desenvolvimento sem Docker

```bash
yarn install
docker compose up -d postgres          # ou um Postgres local; use host "localhost" no DATABASE_URL
yarn db:migrate && yarn db:seed        # cria/atualiza as migrations e popula a loja-demo
yarn dev                               # turbo roda storefront (3000) e admin (3001)
```

Banco já existente de antes da F0.2 (criado com `prisma db push`)? Alinhe o histórico de migrations uma única vez antes do primeiro `db:migrate`/`db:deploy`:

```bash
yarn workspace @repo/db prisma migrate resolve --applied 20261104111225_init
```

## Testes

```bash
yarn test       # Vitest via Turbo: pricing e utils (@repo/db), schemas Zod (admin e storefront)
```

### E2E (Playwright)

Precisa do Postgres rodando (`docker compose up -d postgres mailpit`). Usa um schema (`e2e_test`) separado
do schema de desenvolvimento no mesmo Postgres — `yarn e2e` recria esse schema do zero (migrations + seed)
antes da suíte, e sobe o storefront em `:3100` e o admin em `:3101` (portas diferentes das de dev).

```bash
npx playwright install chromium   # uma vez por máquina
yarn e2e
```

### CI

`.github/workflows/ci.yml` (na raiz do repositório) roda em PRs e na `main`: um job com
`typecheck` + `lint` + `test` + `build`, e outro job separado de E2E com um serviço Postgres.

## Arquitetura

- **Multi-loja**: cada loja tem um `slug`; a vitrine fica em `/{slug}` e o carrinho (Zustand + localStorage) fica separado por loja. Cada lojista (`User`) pertence a uma `Store`, e todas as queries e Server Actions do admin são filtradas pelo `storeId` da sessão.
- **Checkout** (`apps/storefront/src/actions/checkout.ts`): uma Server Action valida o carrinho com Zod, **recalcula preço e estoque a partir do banco**, cria o `Order` (PENDING) com os `OrderItem` e abre uma Stripe Checkout Session em BRL com `metadata.orderId`.
- **Webhook** (`apps/storefront/src/app/api/webhooks/stripe/route.ts`): valida a assinatura usando o corpo cru. Em `checkout.session.completed` (com `payment_status = paid`) marca o pedido como **PAID** e baixa o estoque numa transação **idempotente**, então reenvios do Stripe não duplicam a baixa. Pagamentos assíncronos (boleto) são confirmados em `async_payment_succeeded`. A página de sucesso consulta a sessão como fallback, caso o webhook atrase.
- **Auth do admin**: senha com bcrypt (custo 12), sessão em JWT HS256 (`jose`) num cookie httpOnly com SameSite=Lax e validade de 7 dias. O `middleware.ts` protege todas as rotas, e cada página ou Server Action revalida a sessão no banco (`requireSession`). O login tem tempo de resposta constante e bloqueio após 5 tentativas (em memória, por instância).
- **Preços** em centavos (`Int`), formatados com `Intl.NumberFormat('pt-BR', { currency: 'BRL' })`.
- **Tema da loja**: `primaryColor` e `accentColor` viram CSS variables (`--brand`, `--accent`) no layout `/[store]`, e a cor do texto sobre a cor principal é calculada automaticamente para manter o contraste.

## Teste rápido do webhook (sem Stripe real)

```bash
DATABASE_URL=... STRIPE_WEBHOOK_SECRET=whsec_... WEBHOOK_URL=http://localhost:3000/api/webhooks/stripe \
  node scripts/test-webhook.mjs
# envio 1: HTTP 200 / envio 2: HTTP 200 / status=PAID ... estoque N -> N-1
```

## Operação (F6.10)

- **Erros**: `lib/error-reporting.ts` (admin e storefront) loga estruturado no console sempre e, se
  `SENTRY_DSN` estiver definido, também envia pro Sentry (ou outro servidor compatível, ex.
  GlitchTip) via POST direto no envelope HTTP — sem o SDK `@sentry/nextjs` nem passo de build.
- **Health check**: `GET /api/health` em cada app confere a conexão com o Postgres (`SELECT 1`) e
  responde `503` se o banco estiver fora.
- **Backup**: `./scripts/backup-db.sh` gera um dump comprimido (`pg_dump` via `docker compose exec`)
  e mantém os 7 mais recentes; agende por fora (cron do host, GitHub Actions agendado), mesmo padrão
  dos jobs de F3.4/F3.6. Restaurar: `./scripts/restore-db.sh backups/vitrine-XXXX.sql.gz`.

## Produção

- O schema é aplicado só por migrations: `yarn db:deploy` (`prisma migrate deploy`). Nunca use `db push` em produção.
- Nova alteração de schema em dev: `yarn db:migrate` (cria e aplica a migration), commitar a pasta `packages/db/prisma/migrations/`.
- Upload de imagem de produto usa um storage S3-compatível (`S3_*` no `.env`); em dev é o RustFS do `docker-compose.yml`, em produção troque por S3/R2 só mudando as variáveis.

### Build

```bash
yarn build   # turbo run build — builda @repo/db, @repo/mail, depois admin e storefront, com cache incremental
```

Cada app Next.js usa `output: "standalone"`: o build gera um `server.js` autocontido com apenas as dependências realmente usadas, o que é o que o `Dockerfile` copia.

### Deploy e Docker

O `Dockerfile` é único e parametrizado por `--build-arg APP=storefront|admin`; o `docker-compose.yml` já builda as duas imagens. Para gerar e publicar uma imagem isolada (ex. registry):

```bash
docker build --build-arg APP=storefront -t registry.exemplo.com/vitrine-storefront:latest .
docker build --build-arg APP=admin      -t registry.exemplo.com/vitrine-admin:latest .
docker push registry.exemplo.com/vitrine-storefront:latest
docker push registry.exemplo.com/vitrine-admin:latest
```

O `.dockerignore` mantém o contexto de build pequeno (sem `node_modules`, `.next`, `.turbo`, `.env`), e o healthcheck da imagem usa `GET /api/health` de cada app.

### Escalabilidade

- **Apps stateless**: sessão é um JWT em cookie (`jose`), não há estado em memória entre requisições (exceto o rate-limit de login, por instância) — storefront e admin podem rodar com múltiplas réplicas atrás de um load balancer sem sticky session.
- **Estáticos e CDN**: sirva `.next/static` e `public/` por CDN (ou deixe a plataforma de deploy fazer isso); reduz carga nas réplicas da aplicação e latência para o cliente final.
- **Banco de dados**: Postgres com réplica de leitura para consultas pesadas (relatórios, listagens do admin) conforme o tráfego crescer; o pool de conexões do Prisma deve ser dimensionado por réplica (ou usar um pooler como PgBouncer) para não esgotar `max_connections`.
- **E-mails**: `packages/mail` hoje envia direto via SMTP na mesma request/cron; em alto volume, isole esse envio num worker/fila (ex. BullMQ + Redis, ou um serviço de fila gerenciado) para não bloquear requests do storefront/admin.
- **Cron jobs** (`/api/cron/*`, protegidos por `CRON_SECRET`): em múltiplas réplicas, garanta que o agendador externo (GitHub Actions, cron do host, cron da plataforma) dispare uma única vez por execução, não uma vez por réplica.
- **Storage de imagens**: já é S3-compatível e desacoplado da aplicação, então escala independente das réplicas de app.

### CI/CD

`.github/workflows/ci.yml` roda em PRs e push na `main`, com dois jobs:

1. **build**: `yarn install --frozen-lockfile` → `db:generate` → `typecheck` → `lint` → `test` → `build`. Garante que o monorepo inteiro compila e builda antes de mergear.
2. **e2e**: sobe um serviço Postgres, instala o Chromium do Playwright e roda `yarn e2e` contra as apps reais.

Um deploy automatizado (CD) entraria como um step adicional após o job `build` passar na `main`: build das imagens Docker (`--build-arg APP=...`), push para o registry e rollout (ex. `docker compose pull && up -d`, ou o deploy nativo da plataforma de hospedagem).

### Webhooks (Stripe)

- **Assinatura verificada com o corpo cru**: `apps/storefront/src/app/api/webhooks/stripe/route.ts` valida `Stripe-Signature` com `STRIPE_WEBHOOK_SECRET` antes de processar qualquer evento — payloads sem assinatura válida são rejeitados.
- **Idempotência**: a baixa de estoque e a marcação do pedido como `PAID` rodam numa transação idempotente, então reenvios do Stripe (retries automáticos em caso de timeout/erro 5xx) não duplicam efeito.
- **Fallback sem depender do webhook**: a página de sucesso do checkout também consulta a Stripe Checkout Session diretamente, cobrindo o caso de o webhook atrasar ou falhar temporariamente.
- **Dois endpoints separados**: `/api/webhooks/stripe` (pagamento da vitrine) e `/api/webhooks/stripe-billing` (assinatura do lojista, F6.3) usam segredos distintos — um incidente num não expõe o outro.
- **Em produção**: cadastre os endpoints com HTTPS no Dashboard do Stripe, monitore a aba de webhooks por falhas de entrega, e trate HTTP 5xx do endpoint como o único caso em que o Stripe deve reentregar (sempre responda 2xx depois de processar, mesmo para eventos já conhecidos/duplicados).
