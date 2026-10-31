# Vitrine Commerce — e-commerce white-label (multi-loja)

Monorepo **Turborepo** com duas aplicações Next.js 14 (App Router) isoladas e um pacote Prisma compartilhado.

```
.
├── apps/
│   ├── storefront/      # Área do cliente (porta 3000)
│   └── admin/           # Painel do lojista (porta 3001)
├── packages/
│   └── db/              # Prisma schema + client + utils compartilhados
│       ├── prisma/schema.prisma
│       └── prisma/seed.ts
├── scripts/test-webhook.mjs
├── Dockerfile           # único, parametrizado por --build-arg APP
├── docker-compose.yml
└── .env.example
```

## Subindo com Docker

```bash
cp .env.example .env        # preencha STRIPE_SECRET_KEY e AUTH_SECRET (openssl rand -base64 32)
docker compose up --build
```

O serviço `migrate` aplica o schema (`prisma db push`) e roda o seed (loja `loja-demo` + lojista definido em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Depois sobem:

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

## Variáveis de ambiente

| Variável                | App         | Descrição |
|-------------------------|-------------|-----------|
| `DATABASE_URL`          | todas       | Conexão PostgreSQL |
| `STRIPE_SECRET_KEY`     | storefront  | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | storefront  | Segredo de assinatura do webhook |
| `STOREFRONT_URL`        | storefront/admin | URL pública da vitrine (URLs de retorno do Stripe e link "Ver vitrine") |
| `AUTH_SECRET`           | admin       | Segredo do JWT da sessão (mín. 32 caracteres) |
| `COOKIE_SECURE`         | admin       | `false` para http://localhost; `true` em produção (https) |
| `ALLOW_REGISTRATION`    | admin       | `false` desativa o cadastro de novos lojistas |

## Desenvolvimento sem Docker

```bash
yarn install
docker compose up -d postgres          # ou um Postgres local; use host "localhost" no DATABASE_URL
yarn db:push && yarn db:seed
yarn dev                               # turbo roda storefront (3000) e admin (3001)
```

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

## Produção

- Troque `prisma db push` por migrations versionadas: `yarn workspace @repo/db db:migrate`, depois `prisma migrate deploy` no serviço `migrate`.
- As imagens dos produtos são URLs. Para upload, conecte um storage (S3, R2 etc.).
