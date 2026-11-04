# MultiStore (Vitrine Commerce)

Plataforma de e-commerce multi-loja (white-label, BRL, pt-BR). O objetivo é chegar perto da
Nuvemshop: cada lojista cria sua loja, vende e gerencia tudo pelo painel.
O plano de evolução está em `ROADMAP.md`. Antes de qualquer tarefa do roadmap, leia a seção dela lá.

## Onde fica o código

Todo o código ativo está em `ecommerce/` (monorepo Turborepo + Yarn 1 workspaces):

- `apps/storefront`: vitrine do cliente final, Next.js 14 App Router, porta 3000
- `apps/admin`: painel do lojista, Next.js 14 App Router, porta 3001
- `packages/db`: schema Prisma (PostgreSQL), client e utilitários compartilhados
- `packages/mail`: envio de e-mail (nodemailer/SMTP) e templates
- `scripts/`: `test-webhook.mjs` (simula webhook do Stripe) e `storage-init.mjs` (cria o bucket)

## Comandos

Rode sempre de dentro de `ecommerce/`:

```bash
yarn install
docker compose up -d postgres storage mailpit   # dependências (Postgres 5432, S3 9000, Mailpit 8025)
yarn db:generate                                # gera o Prisma Client
yarn db:migrate && yarn db:seed                 # cria/aplica migrations + loja-demo
yarn dev                                        # storefront :3000 e admin :3001
yarn typecheck                                  # tsc em todos os workspaces
yarn lint                                       # next lint (admin e storefront)
yarn test                                       # Vitest (packages/db, admin, storefront) via Turbo
yarn build                                      # next build das duas apps
docker compose up --build                       # stack completa em containers
```

Testes E2E (Playwright, precisa do Postgres rodando):

```bash
npx playwright install chromium   # uma vez por máquina
yarn e2e                          # sobe storefront :3100 e admin :3101 num schema de teste isolado
```

- `DATABASE_URL` usa o host `postgres` dentro do Docker e `localhost` fora dele.
- E-mails de desenvolvimento aparecem no Mailpit: http://localhost:8025
- Lojista de teste: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env`. Loja de teste: `loja-demo`.
- O desenvolvedor usa **Windows**: scripts do `package.json` precisam ser multiplataforma
  (nada de `cp`, `rm -rf` ou `export VAR=`; use scripts Node ou pacotes como `rimraf` e `cross-env`).

## Definição de pronto

Antes de dizer que uma tarefa terminou:

1. `yarn typecheck`, `yarn lint`, `yarn test` e `yarn build` passam.
2. Mudou o schema: migration criada e `prisma/seed.ts` atualizado para os dados novos.
3. Nova variável de ambiente: adicionada em `.env.example`, em `turbo.json` (`globalPassThroughEnv`,
   senão ela não chega às apps), no `docker-compose.yml` e na tabela do `ecommerce/README.md`.
4. Tarefa marcada como `[x]` no `ROADMAP.md`, com decisões importantes anotadas na seção "Decisões".
5. Explique ao usuário como testar manualmente o que mudou.

## Arquitetura

**Multi-loja.** Cada `Store` tem um `slug`. A vitrine responde em três formatos:
`/{slug}` no domínio principal, `{slug}.STOREFRONT_ROOT_DOMAIN` (subdomínio) ou `customDomain`.
O `apps/storefront/src/middleware.ts` resolve o host, reescreve para `/{slug}/...` e marca o header
`x-store-mode: tenant`. Consequências:

- Links internos da vitrine: sempre com `getStoreBase(slug)` + `storeHref(base, path)` (`lib/paths.ts`)
  em Server Components, ou `useStoreContext().href(path)` em Client Components. Nunca `/${slug}` fixo.
- URLs absolutas (e-mails, Stripe, feeds): `storeUrl()` e `orderTrackingUrl()` de `@repo/db/urls`.
- O middleware não roda em `/api/*`: rotas de API não sabem a loja pelo host, recebem-na por parâmetro.

**Admin.** Sessão JWT HS256 (`jose`) no cookie `admin_session`. O `middleware.ts` só confere a
assinatura; toda página e toda Server Action chama `requireSession()` (`lib/session.ts`), que revalida
no banco e devolve o `storeId` a ser usado.

**Checkout e pagamento.** `storefront/src/actions/checkout.ts` valida o carrinho, recalcula preço no
banco e **reserva o estoque na criação do pedido** (`@repo/db` `reserveStock`, dentro da mesma
transação que cria o `Order` como `PENDING`), depois abre uma Stripe Checkout Session (expira em 30
min) com `metadata.orderId`. O webhook (`app/api/webhooks/stripe/route.ts`) chama `markOrderPaid`
(`lib/orders.ts`), que muda o status de forma idempotente e envia a confirmação — o estoque já foi
baixado na reserva, não no pagamento. Se o pedido expira, falha ou é cancelado, `setOrderStatus`
devolve o estoque (`releaseStock`, idempotente via `Order.stockReleasedAt`). A página
`/checkout/success` chama `markOrderPaid` de novo como fallback.

**Pacotes compartilhados.**
- `@repo/db`: `prisma` e tipos. Só servidor.
- `@repo/db/utils`: funções puras (formatação BRL, labels de status, regex). Pode ir para Client Components.
- `@repo/db/urls`: lê variáveis de ambiente. Só servidor.
- `@repo/mail`: envios únicos protegidos por um campo `*SentAt` gravado com `updateMany` atômico.

**Upload.** `admin/src/actions/uploads.ts` valida a assinatura binária da imagem e grava em storage
S3-compatível (`lib/storage.ts`; RustFS em dev, S3/R2 em produção).

## Regras que não podem ser quebradas

1. **Isolamento entre lojas.** No admin, toda leitura e escrita filtra pelo `storeId` da sessão.
   Alterações e exclusões usam `updateMany`/`deleteMany` com `{ id, storeId }` (padrão de
   `actions/products.ts`). Nunca aceite `storeId` vindo de formulário ou query string. Na vitrine,
   toda busca filtra pelo `store.id` resolvido a partir do slug.
2. **Dinheiro em centavos.** Sempre `Int` com sufixo `InCents`. Exiba com `formatBRL`; converta
   entradas com `parseBRLToCents` e `centsToInput`. Nunca use float para valores.
3. **O servidor decide o preço.** Preço, estoque, desconto e frete são recalculados no servidor no
   momento do pagamento. O carrinho do navegador é só uma sugestão.
4. **Idempotência.** Webhooks e jobs mudam status com `updateMany` condicionado ao status anterior,
   e só disparam efeitos colaterais (estoque, e-mail) quando `count > 0`.
5. **Validação com Zod** em toda Server Action (schemas do admin em `admin/src/lib/validation.ts`).
   Erros voltam como `FormState` (`{ error | success | fieldErrors }`), não como exceção.
6. **Segredos** só em variáveis de ambiente. Nunca commite `.env`. Tokens de terceiros guardados no
   banco (gateway, frete, ERP) devem ser criptografados.
7. **Integrações externas não derrubam o fluxo principal.** Falha de e-mail ou API externa: `catch` +
   `console.error("[area] ...")` e o fluxo segue.

## Convenções de código

- TypeScript strict. Server Components por padrão; `"use client"` só onde há estado ou efeito.
- Mutações via Server Actions em `src/actions/*.ts`, com `revalidatePath` depois de gravar.
- Formulários do admin: `useFormState` + `SubmitButton`, `FieldError` e `FormMessage` de `components/form-ui.tsx`.
- Alias `@/` aponta para `src/` em cada app.
- Filtros e paginação da vitrine ficam na URL (`searchParams`, formulários GET).
- Interface 100% em pt-BR; nomes de código (variáveis, models, campos) em inglês camelCase;
  comentários curtos em pt-BR.
- Todo elemento interativo ou que exibe dado importante tem `data-testid` em kebab-case
  (ex.: `product-name-input`, `order-row-{id}`).
- Datas com `Intl.DateTimeFormat("pt-BR")`.
- Estilo com Tailwind e as classes já existentes:
  - Admin: cores `ink`, `bone`, `lime`, `line`; classes `.btn`, `.btn-outline`, `.btn-danger`, `.field`, `.label`, `.card`, `.th`, `.td`.
  - Vitrine: `brand` e `accent` (CSS vars por loja), `paper`, `ink`; classes `.btn-brand`, `.btn-ghost`, `.field`, `.label`.
  - Não adicione biblioteca de componentes sem perguntar.
- Prisma: models novos com `id String @id @default(cuid())`, `storeId` com relação
  `onDelete: Cascade` para `Store` e `@@index([storeId, ...])`.

## Cuidados conhecidos

- O webhook precisa do corpo cru (`req.text()`) para validar a assinatura. Não faça parse antes.
- O limite de tentativas de login é em memória (some ao reiniciar e não funciona com várias instâncias).
- Schema só muda por migrations (`yarn db:migrate` em dev, `yarn db:deploy` em produção); nunca
  `prisma db push`. Banco criado antes da F0.2: alinhar uma vez com
  `yarn workspace @repo/db prisma migrate resolve --applied 20261104111225_init`.
- Hoje todas as lojas recebem na mesma conta Stripe (`STRIPE_SECRET_KEY` global). A F1.4 corrige isso.

## Como trabalhar

- Uma tarefa do roadmap por vez, numa branch `feat/<id>-<nome>` (ex.: `feat/f1-2-reserva-estoque`).
- Planeje antes de editar quando a tarefa mexer em schema, pagamento, autenticação ou estoque.
- Tarefas marcadas como **(grande)** no roadmap: proponha etapas e faça uma etapa por sessão.
- Pergunte antes de: apagar dados ou arquivos fora do escopo, trocar provedor (pagamento, frete, e-mail),
  adicionar serviço pago ou mudar o modelo de autenticação.
- Tarefas com **Decisão** no roadmap: apresente as opções com prós e contras e espere a escolha.
