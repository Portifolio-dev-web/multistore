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

**Checkout e pagamento.** A vitrine tem um checkout próprio em `/{slug}/checkout` (fora do grupo de
rotas `(shop)`, layout enxuto sem menu nem rodapé): 3 passos client-side — identificação (e-mail,
nome, telefone, CPF/CNPJ), endereço (CEP com preenchimento automático via ViaCEP) e resumo —
validados com os schemas de `storefront/src/lib/validation.ts`. Só o passo final chama a Server
Action. `storefront/src/actions/checkout.ts` valida tudo de novo no servidor (nunca confia só no
formulário), recalcula preço no banco e **reserva o estoque na criação do pedido** (`@repo/db`
`reserveStock`, por `variantId` — estoque mora em `ProductVariant`, nunca em `Product` —, dentro da
mesma transação que cria o `Order` como `PENDING`, já com
`customerEmail`/`customerName`/`customerPhone`/`customerDocument`/`shippingAddress`), depois abre
uma Stripe Checkout Session (expira em 30 min, `customer_email` pré-preenchido, sem
`shipping_address_collection`) com `metadata.orderId`. O webhook (`app/api/webhooks/stripe/route.ts`) chama `markOrderPaid`
(`lib/orders.ts`), que muda o status de forma idempotente e envia a confirmação — o estoque já foi
baixado na reserva, não no pagamento. Se o pedido expira, falha ou é cancelado, `setOrderStatus`
devolve o estoque (`releaseStock`, idempotente via `Order.stockReleasedAt`). A página
`/checkout/success` chama `markOrderPaid` de novo como fallback. Cada mudança de status (e o envio
de e-mail) grava um `OrderEvent` dentro da mesma transação/guarda de idempotência que já protegia a
mudança — sem mecanismo novo de idempotência. A timeline aparece no admin (com campo de nota
interna, tipo `NOTE`) e na página pública de acompanhamento (sem as notas).

**Categorias.** `Category` é auto-relacionada (`parentId`/`children`) e liga a `Product` por
muitos-para-muitos (m2m implícita do Prisma — sem model de junção explícito). Subárvore (produto
"Roupas > Camisetas" aparece na página de "Roupas") e breadcrumb são calculados em memória com
`categoryDescendantIds`/`categoryAncestors` (`@repo/db/utils`), não com SQL recursivo — a lista de
categorias de uma loja é pequena. A vitrine resolve `/categorias/[...slug]` pelo último segmento da
URL (slug é único por loja), sem validar se os segmentos anteriores batem com a árvore de verdade.

**Variações.** `Product` tem preço/preço "de" base; `ProductOption` (`name`, `values[]`) e
`ProductVariant` (`combination` Json, `priceInCents`/`compareAtPriceInCents` opcionais — nulo herda
do produto —, `stock`, `sku`, `imageUrl` opcional) ficam por baixo. Todo produto tem pelo menos uma
variante (a "padrão", `combination: {}`, sem opções) — é nela, nunca em `Product`, que mora o
estoque (`effectivePrice`/`effectiveCompareAtPrice` em `@repo/db/utils` resolvem o preço "efetivo").
Admin: `/products/[id]/variants` — salvar as opções recalcula a grade via `cartesianCombinations`
(cria a combinação nova, apaga a que não existe mais; pedido antigo mantém o nome/preço gravados no
`OrderItem`, só perde o vínculo por `onDelete: SetNull`). Vitrine: `ProductVariantPicker` mostra um
botão por valor de opção, desabilita a combinação esgotada (fixando as outras opções já escolhidas,
sem recalcular a seleção inteira) e troca preço/estoque/foto com a escolha; carrinho e checkout
(`reserveStock`/`releaseStock`, `pricing.ts`, `OrderItem.variantId`) operam por `variantId` desde a
fundação, nunca por `productId`.

**Importar/exportar CSV.** `/products/import-export` no admin. `GET /api/products/export` gera o CSV
(uma linha por variante; `@repo/db/utils` tem `buildCsv`/`parseCsv` próprios, sem dependência
nova). A importação lê e pré-valida o arquivo no navegador (mesma `parseImportCsv` reusada depois
no servidor, que nunca confia só no que já foi validado no cliente) e **só atualiza** variantes
existentes pelo SKU — nunca cria produto ou variante; linha sem SKU é ignorada e aparece no
relatório.

**Imagens.** `Product.images` (URLs) e `Product.imageAlts` (texto alternativo) são dois arrays
paralelos na mesma posição — não um array de objetos nem um model `ProductImage`. `ProductImage`
usa `next/image` (`fill` + `sizes` por contexto); `remotePatterns` no `next.config.mjs` libera o
storage e o Unsplash do seed.

**Descrição com IA.** `admin/src/actions/ai-description.ts` chama a Anthropic de verdade via
`@anthropic-ai/sdk` (`ANTHROPIC_MODEL`, padrão `claude-haiku-5-5`). Sem `ANTHROPIC_API_KEY`
configurada, o botão "Gerar com IA" do formulário de produto fica escondido. Limite diário por
loja: uma linha em `AiGeneration` por chamada, conta quantas tem "hoje" — sem job de reset, a
própria consulta já filtra pela data. Preenche só a descrição; não existe campo de SEO no
`Product` hoje, então título/meta sugeridos pela IA só aparecem na tela pra copiar manualmente.

**Conta do cliente.** Login sem senha: `Customer` (único por `storeId`+`email`, criado/atualizado
automaticamente no checkout pelo e-mail, sem precisar de login) e `CustomerLoginToken` (hash
SHA-256 do token, expira em 15 min, uso único). Sessão JWT própria (`storefront/src/lib/customer-session.ts`,
`jose`, cookie `customer_session`, mesmo `AUTH_SECRET` do admin) — separada da sessão do lojista.
`/{slug}/conta` (grupo `(protected)` dentro de `(shop)`) exige sessão válida **e** que
`storeId` bata com a loja atual (mesmo cookie não vale pedido de outra loja). Checkout pré-preenche
identificação/endereço quando o cliente está logado.

**Cupons e promoções automáticas.** `Coupon` (código único por loja, `PERCENT`/`FIXED`/`FREE_SHIPPING`)
e `Promotion` (`BUY_X_PAY_Y` ou `QUANTITY_DISCOUNT`, por produto ou toda a loja) são avaliados por
funções puras em `@repo/db/pricing` (`applyCoupon`, `applyPromotions`, `applyDiscounts`) — a mesma
lógica roda na pré-visualização do carrinho/checkout (`previewDiscounts`, sem efeito no banco) e na
criação do pedido de verdade (`createCheckoutSession`), que nunca confia no cálculo do cliente.
Ordem combinada: promoções aplicam primeiro por produto, cupom aplica depois sobre o restante.
`OrderItem` sempre guarda o preço **original** (o desconto aparece como linha separada em
`Order.discountInCents`); só o valor cobrado no Stripe usa preços proporcionalmente reduzidos
(`distributeDiscountProportionally`, já que o Stripe não aceita `unit_amount` negativo). Uso do
cupom (`Coupon.usesCount`) só é contado quando o pedido é de fato pago, dentro da mesma guarda de
idempotência de `markOrderPaid`.

**Carrinho abandonado.** `AbandonedCart` é salvo (silencioso, nunca bloqueia o checkout) quando o
cliente valida a etapa de identificação sem terminar a compra. `markOrderPaid` marca o carrinho como
recuperado pelo e-mail. `/api/cron/abandoned-carts` e `/api/cron/review-requests` (protegidas por
`CRON_SECRET`) são chamadas por um agendador externo — nenhum serviço novo no `docker-compose.yml`
(ver Decisões). Recuperar (`/carrinho/recuperar/[token]`) sempre busca o estoque/preço atuais de
novo, nunca confia no snapshot salvo no e-mail.

**Avaliações.** `Review` entra sempre com `approved: false`; só aparece na vitrine depois de
aprovada no admin (`/reviews`). "Compra verificada" é um link assinado por HMAC
(`storefront/src/lib/review-token.ts`, mesmo `AUTH_SECRET`) ligando `orderId`+`productId` sem
precisar de uma tabela nova — mandado só depois que o pedido tem `fulfillmentStatus: DELIVERED`.

**WhatsApp.** `Store.whatsapp` (só dígitos, `WHATSAPP_PHONE` valida DDI+DDD+número) habilita o botão
flutuante da vitrine, o "Comprar pelo WhatsApp" na página do produto e o link `wa.me` no pedido (admin)
e no carrinho abandonado — todos somem sem o número configurado (`waLink()` em `@repo/db/utils`).

**Página inicial por seções.** `Store.homeSections` (publicado) e `Store.homeSectionsDraft`
(rascunho) são `Json` validados por um union discriminado do Zod em `@repo/db/content`
(`homeSectionSchema`: `hero`, `bannerCarousel`, `productShowcase`, `benefits`, `textImage`,
`newsletter`). `parseHomeSections()` nunca lança — item inválido é descartado, nunca derruba a
página (JSON malformado vira lista vazia). A home (`(shop)/page.tsx`) sempre lê `homeSections`
publicado, a não ser com `?preview=1` (sem autenticação — o rascunho não tem nada sensível, só
ainda não está no ar), que lê `homeSectionsDraft`. Admin (`/home`): edita só o rascunho; "Publicar"
copia rascunho → publicado. O catálogo com busca/filtro/paginação que antes vivia na home
(F0–F2.5) mudou para `/busca` — a home virou 100% seções configuráveis. Toda loja nova
(seed e `register()`) já nasce com `defaultHomeSections()` (vitrine de novidades, benefícios,
promoção, newsletter).

**Menu, rodapé e páginas institucionais.** `Store.navigation` (Json, `parseNavigation()` —
mesma defesa de JSON inválido) vira links no cabeçalho (`NavMenu`) e no rodapé, resolvendo
`category`/`page`/`url` pro caminho certo. Rodapé mostra `Store.socialLinks` (Json,
`parseSocialLinks()`) e os dados legais (`legalName`, `taxId`, `legalAddress` Json — exigidos pelo
Decreto 7.962/2013); falta de `legalName`/`taxId` mostra aviso no admin (`/settings`), nunca na
vitrine. `Page` (Markdown em `content`, renderizado por `@repo/db/markdown` — `renderSafeMarkdown`
escapa `&`/`<`/`>` **antes** de qualquer transformação, então HTML/`<script>` colado nunca vira tag
de verdade, só texto visível) fica em `/p/[slug]`; toda loja nova já nasce com as 4 páginas de
`defaultPages()` (Sobre nós, Trocas e devoluções, Política de privacidade, Frete e entrega), com
"Gerar com IA" reaproveitando o limite diário da F2.8 (`generatePageContent`).

**Temas e loja em construção.** `Store.theme`/`Store.font` (enums) viram `data-theme`/`data-font`
no layout (`[store]/layout.tsx`) — `globals.css` troca `--radius-card`/`--radius-btn`/`--radius-field`
e as CSS vars de fonte (`--font-display`/`--font-sans`) por tema/fonte, sem precisar recarregar
fonte nova do Google Fonts nem tocar em conteúdo/seção. `Store.maintenanceMode` bloqueia todo o
`[store]/layout.tsx` (menos a própria tela de senha) atrás de `maintenancePasswordHash` (bcrypt);
o cookie de acesso (`storefront/src/lib/maintenance.ts`) é só um HMAC do `storeId` — não é um
boundary de segurança real, só evita pedir a senha de novo a cada página. Loja em construção some
da lista pública de lojas em `/` (`maintenanceMode: false` no `where`).

**SEO técnico.** `seoTitle`/`seoDescription` em `Product`, `Category` e `Page` (em branco usa
nome/descrição como fallback) alimentam `generateMetadata` (título, descrição, `alternates.canonical`,
Open Graph) nas 3 páginas públicas correspondentes. Canonical/OG sempre usam `storeUrl()`
(`@repo/db/urls`) puro — nunca combinado com `getStoreBase()`, que já embute o `/{slug}` no modo de
caminho principal (misturar os dois duplica o prefixo). `sitemap.xml`/`robots.txt` por loja
(`apps/storefront/src/app/[store]/sitemap.xml/route.ts` e `.../robots.txt/route.ts`) são rotas
comuns, não o arquivo especial `sitemap.ts`/`robots.ts` do Next — garante receber `params.store` e
funciona igual nos 3 modos de domínio (o middleware já reescreve pra `/${slug}/...`); respeitam
`maintenanceMode`. JSON-LD (`apps/storefront/src/lib/seo.ts`): `Organization` no layout da loja,
`Product`+`BreadcrumbList` no produto, `BreadcrumbList` na categoria — serializado com escape de `<`
pra nunca fechar a `<script>` cedo.

**Pixels, analytics e eventos.** `Store.gaId`/`gtmId`/`metaPixelId`/`tiktokPixelId` (admin →
Configurações) só carregam na vitrine depois que `CookieConsentBanner` registra "accepted" em
`localStorage` (`lib/consent.ts`) — nunca é dado sensível, por isso não precisa de cookie/servidor.
`AnalyticsScripts` escuta um evento customizado pra reagir à escolha sem recarregar a página.
Eventos de e-commerce (`lib/analytics-events.ts`, no-op se nenhum pixel carregou): `view_item` na
página de produto, `add_to_cart` no botão, `begin_checkout` ao entrar no checkout com itens,
`purchase` na página de sucesso — este último deduplicado por `localStorage` por `orderId` pra nunca
contar duas vezes num reload.

**Feeds de produtos.** `Product.brand`/`gtin`/`condition` alimentam `/feeds/google.xml` e
`/feeds/meta.xml` (`apps/storefront/src/lib/feed.ts`, `buildProductFeed()`) — mesmo RSS 2.0 com
namespace `g:`, aceito pelos dois (por isso um só builder pras duas rotas). Um item por
`ProductVariant` (preço/estoque são por variante), `g:item_group_id` = `productId` agrupando as
variações do mesmo produto.

**E-mails transacionais (F5.4).** Além da confirmação de pagamento e do aviso de envio (F1.x/F3.x),
`@repo/mail` manda: "pedido recebido" (dispara no `checkout.session.completed` quando
`payment_status` ainda não é "paid" — caso do Pix/boleto assíncrono no Stripe; cartão vai direto pra
confirmação), aviso de nova venda pro lojista (primeiro `User` da loja — ainda não existe
`Membership`/equipe, isso é F6.2), cancelamento e reembolso (ação do lojista no admin — pedido do
pedido, `cancelOrder`/`refundOrder` em `apps/admin/src/actions/orders.ts`, devolvem o estoque via
`releaseStock` e avisam o cliente) e confirmação de entrega (mesmo checkbox "avisar cliente" do
envio). `OrderStatus.REFUNDED` é novo; `CANCELED` ganhou o primeiro gatilho real (antes só existia no
tipo). Não há reembolso de verdade via API do Stripe — "marcar como reembolsado" só registra e avisa;
o lojista reembolsa no Dashboard por fora.

**Pacotes compartilhados.**
- `@repo/db`: `prisma` e tipos. Só servidor.
- `@repo/db/utils`: funções puras (formatação BRL, labels de status, regex). Pode ir para Client Components.
- `@repo/db/urls`: lê variáveis de ambiente. Só servidor.
- `@repo/db/pricing`: cálculo de preço/desconto, puro. Pode ir para Client Components.
- `@repo/db/content`: schemas Zod + parsers defensivos de seções/menu/redes sociais/páginas padrão. Pode ir para Client Components.
- `@repo/db/markdown`: `renderSafeMarkdown`, puro. Pode ir para Client Components.
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
- `CREATE EXTENSION pg_trgm` cria o `gin_trgm_ops` num schema (normalmente `public`) — o `yarn e2e`
  roda as migrations num schema isolado (`e2e_test`) sem `public` no `search_path`, então um índice
  GIN com esse operador sem qualificar o schema (`public.gin_trgm_ops`) funciona no dev mas quebra
  só no e2e. Qualifique sempre que usar extensão + índice assim numa migration.
- Um arquivo `"use client"` só pode exportar componentes React. Uma função utilitária comum
  exportada junto (ex.: `toVariantRow` em `variants-grid.tsx`) vira uma referência de client
  component e quebra em runtime ("is not a function") se um Server Component tentar chamá-la —
  bota esse tipo de helper num arquivo separado sem `"use client"`.
- Quando um Server Action de um formulário precisa atualizar os dados que outro componente da
  mesma página usa como `initial` (ex.: salvar opções recalcula a grade de variações abaixo),
  só `revalidatePath` não é suficiente — o componente já montado não re-sincroniza sozinho. Chama
  `router.refresh()` num `useEffect` quando `state.success` fica verdadeiro, e dá uma `key` pro
  componente dependente (baseada nos ids atuais) pra ele remontar com o `initial` novo.

## Como trabalhar

- Uma tarefa do roadmap por vez, numa branch `feat/<id>-<nome>` (ex.: `feat/f1-2-reserva-estoque`).
- Planeje antes de editar quando a tarefa mexer em schema, pagamento, autenticação ou estoque.
- Tarefas marcadas como **(grande)** no roadmap: proponha etapas e faça uma etapa por sessão.
- Pergunte antes de: apagar dados ou arquivos fora do escopo, trocar provedor (pagamento, frete, e-mail),
  adicionar serviço pago ou mudar o modelo de autenticação.
- Tarefas com **Decisão** no roadmap: apresente as opções com prós e contras e espere a escolha.
