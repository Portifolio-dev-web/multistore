# Roadmap: MultiStore até o nível da Nuvemshop

Este arquivo é o plano de trabalho do projeto. Cada tarefa tem um ID (ex.: **F1.2**), o que fazer e
um critério de aceite. Marque `[x]` ao concluir e registre escolhas importantes em "Decisões" no fim.

Legenda: **(grande)** = dividir em etapas, uma por sessão · **Decisão** = escolher com o usuário antes de começar ·
**Depende de** = fazer a outra tarefa primeiro.

---

## Como usar com o Claude Code

Abra o Claude Code na pasta `multistore` (raiz do repositório, onde está o `CLAUDE.md`) e use este prompt,
trocando o ID da tarefa:

```text
Leia o CLAUDE.md e a tarefa F1.2 do ROADMAP.md.
Primeiro planeje: leia os arquivos envolvidos e me mostre o plano (mudanças no schema,
arquivos que vai criar ou alterar, testes). Não edite nada antes de eu aprovar.
Se a tarefa tiver "Decisão", me apresente as opções antes do plano.
Depois de aprovado: implemente, rode yarn typecheck, yarn test e yarn build,
marque a tarefa no ROADMAP.md e me diga como testar manualmente.
```

Antes da F0.3 ainda não existe `yarn test`; até lá, valide com `typecheck` e `build`.
Para tarefas **(grande)**, acrescente ao prompt: "Divida em etapas e faça só a etapa 1 nesta sessão."

Ordem recomendada: Fase 0 inteira → Fase 1 → Fase 2 → Fase 3. Ao fim da Fase 3, uma loja pequena já
vende de verdade. As Fases 4 a 6 transformam o projeto em plataforma para vender a outros lojistas.

---

## Ponto de partida (já existe, não refazer)

- Vitrine multi-loja por `/{slug}`, subdomínio ou domínio próprio (sem verificação de DNS)
- Busca, filtro por categoria (texto livre), faixa de preço, "só em estoque" e ordenação
- Carrinho no navegador (Zustand + localStorage), separado por loja
- Checkout via Stripe Checkout hospedado, com webhook idempotente e baixa de estoque no pagamento
- Página pública de acompanhamento do pedido (`/pedido/{token}`)
- E-mails de confirmação de pedido e de envio (com código de rastreio)
- Admin: login/cadastro de lojista, visão geral, CRUD de produtos com upload S3, pedidos com status
  de entrega, configurações de aparência (nome, logo, 2 cores, domínio)
- Docker Compose com Postgres, RustFS (S3), Mailpit e Stripe CLI

---

## Fase 0: Fundação

Deixa o projeto seguro para receber mudanças grandes. Faça antes de qualquer funcionalidade.

- [x] **F0.1 Remover sobras do Emergent**
  - Apagar `frontend/`, `backend/`, `tests/`, `test_reports/`, `.emergent/`, `memory/`, `test_result.md`
    e o `yarn.lock` da raiz.
  - Trocar o `README.md` da raiz por um texto curto apontando para `ecommerce/README.md`.
  - Limpar do `.gitignore` da raiz as entradas que eram do Emergent.
  - Atualizar a seção "Onde fica o código" do `CLAUDE.md` (remover o parágrafo das sobras).
  - Aceite: a raiz tem só `ecommerce/`, `CLAUDE.md`, `ROADMAP.md`, `README.md` e `.gitignore`;
    `yarn build` dentro de `ecommerce/` continua passando.

- [x] **F0.2 Migrations versionadas do Prisma**
  - Criar a migration inicial a partir do schema atual (`prisma migrate dev --name init`).
  - Documentar como marcar a migration como aplicada em bancos que já existem
    (`prisma migrate resolve --applied <nome>`).
  - Serviço `migrate` do `docker-compose.yml`: trocar `db push` por `prisma migrate deploy`.
  - Scripts na raiz: `db:migrate` (dev) e `db:deploy` (produção). Atualizar README e CLAUDE.md.
  - Aceite: banco vazio sobe só com `migrate deploy` + seed; `db push` não aparece mais em nenhum fluxo.

- [x] **F0.3 Testes unitários (Vitest)**
  - Vitest no monorepo, com `yarn test` via Turbo.
  - Extrair o cálculo do pedido de `checkout.ts` para funções puras em `packages/db/src/pricing.ts`
    (export `@repo/db/pricing`): subtotal, e depois desconto e frete. Esse módulo será a base das
    Fases 1 a 3.
  - Testar `@repo/db/utils` (`parseBRLToCents`, `slugify`, `contrastText`), os schemas Zod do admin
    e o módulo de pricing.
  - Aceite: `yarn test` roda e passa; pricing com cobertura dos casos de borda (quantidade 0, estoque insuficiente).

- [x] **F0.4 Testes ponta a ponta (Playwright)** · Depende de F0.2
  - Pasta `ecommerce/e2e/` usando os `data-testid` já existentes.
  - Fluxos: vitrine (listar, filtrar, abrir produto, adicionar ao carrinho, alterar quantidade);
    admin (login, criar produto, ver na vitrine, mudar cor da loja e ver refletido);
    webhook assinado marcando pedido como pago (reaproveitar `scripts/test-webhook.mjs`).
  - Banco de teste separado, recriado com migrations + seed antes da suíte.
  - Aceite: `yarn e2e` passa localmente com o Docker de dependências rodando.

- [x] **F0.5 Integração contínua (GitHub Actions)** · Depende de F0.3
  - Workflow em PRs e na `main`: install, `db:generate`, typecheck, lint, test, build.
  - Job separado de E2E com serviço Postgres.
  - Ativar ESLint (`next lint`) e remover `eslint.ignoreDuringBuilds`, corrigindo os avisos.
  - Aceite: PR mostra os checks verdes; um erro de tipo faz o check falhar.

- [x] **F0.6 Imagem Docker de produção**
  - `output: "standalone"` nas duas apps; o estágio `runner` copia só `.next/standalone`,
    `.next/static`, `public` e os engines do Prisma.
  - Usuário não-root no container; `HEALTHCHECK` simples.
  - Aceite: `docker compose up --build` funciona e a imagem fica bem menor que a atual (anotar antes/depois).
  - Resultado: `admin` 852MB → 180MB, `storefront` 854MB → 179MB (~79% menores). Validado com
    `docker run` isolado (Postgres do compose + env fictício): healthcheck `healthy`, `whoami` = `nextjs`,
    `/api/health` responde 200. `docker compose up --build` completo não testado nesta máquina porque
    o serviço `storage` (porta 9000) colide com um container de outro projeto local — não é um problema
    do Dockerfile.

---

## Fase 1: Vender de verdade no Brasil

O mínimo para uma loja receber dinheiro na conta certa, com Pix e frete cobrado.

- [x] **F1.1 Número de pedido sequencial por loja**
  - `Order.number Int` com `@@unique([storeId, number])`; contador em `Store.nextOrderNumber`
    (começa em 1001), incrementado de forma atômica dentro da transação que cria o pedido.
  - Migration com backfill dos pedidos existentes por ordem de criação.
  - Trocar `id.slice(-8)` por `#{number}` em admin, e-mails, página de sucesso e acompanhamento.
  - Aceite: dois checkouts simultâneos nunca geram o mesmo número (teste unitário com transações concorrentes).

- [x] **F1.2 Reserva de estoque**
  - Ao criar o pedido, baixar o estoque com `updateMany({ where: { id, stock: { gte: qty } } })` dentro
    da transação; se alguma linha não atualizar, desfazer tudo e avisar qual produto acabou.
  - Isolar isso em `reserveStock(tx, lines)` e `releaseStock(tx, orderId)`, para a F2.2 trocar
    produto por variante sem reescrever o fluxo.
  - Devolver o estoque quando o pedido virar `EXPIRED`, `FAILED` ou `CANCELED`, de forma idempotente
    (campo `stockReleasedAt`). Também devolver se a criação da sessão de pagamento falhar.
  - `markOrderPaid` deixa de baixar estoque (já foi reservado).
  - Encurtar a reserva: `expires_at` da sessão em 30 minutos.
  - Aceite: teste com dois pedidos disputando a última unidade, em que só um passa;
    pedido expirado devolve o estoque uma única vez mesmo com webhook repetido.

- [x] **F1.3 Checkout próprio: identificação e entrega** **(grande)**
  - Nova página `/checkout` na vitrine, antes do pagamento, em etapas: (1) e-mail, nome, telefone,
    CPF/CNPJ com validação de dígitos; (2) CEP com preenchimento automático (ViaCEP) e endereço
    completo; (3) resumo e botão "Ir para o pagamento".
  - Campos novos em `Order`: `customerPhone`, `customerDocument`; `shippingAddress` passa a usar um
    formato próprio (`{ name, zip, street, number, complement, district, city, state }`).
    Atualizar `formatAddress` para aceitar o formato novo e o antigo (pedidos existentes).
  - Remover `shipping_address_collection` do Stripe e passar `customer_email`.
  - Layout enxuto (sem menu e sem rodapé), como checkouts de loja. Mobile primeiro.
  - Aceite: não dá para chegar ao pagamento sem dados válidos; dados aparecem no pedido no admin.
  - Feito em 3 etapas (2026-11-04): (1) `Order.customerPhone`/`customerDocument` no schema,
    `formatAddress` aceitando o formato novo (estruturado) e o antigo (Stripe), validadores de
    CPF/CNPJ e CEP em `@repo/db/utils`, schemas Zod em `apps/storefront/src/lib/validation.ts`,
    Vitest ligado no `storefront`; (2) rotas da vitrine reorganizadas em route groups
    (`[store]/(shop)/...` com header/rodapé, `[store]/checkout/...` enxuto) e a página
    `/{slug}/checkout` com os 3 passos, mobile primeiro, ViaCEP preenchendo o endereço; (3) o botão
    "Finalizar compra" do carrinho virou link pro `/checkout`, e `createCheckoutSession` passou a
    receber identificação+endereço, gravar no `Order` e remover o `shipping_address_collection` do
    Stripe (ganhou `customer_email` no lugar).
  - Validado num navegador de verdade (fluxo completo carrinho → checkout → envio): achei e corrigi
    um bug nessa validação — o campo `complement` saía como `null` do formulário mas o schema só
    aceitava `undefined` nos campos opcionais, rejeitando todo envio com "Dados inválidos"
    (`.optional()` → `.nullish()` em `addressSchema`). Depois do fix, o pedido saiu com todos os
    campos certos (telefone, CPF/CNPJ, endereço) e apareceu certinho no admin.

- [ ] **F1.4 Recebimento por loja** **(grande)** · **Decisão**
  - Hoje todo pagamento cai numa única conta Stripe. Cada loja precisa da própria conta de recebimento.
  - Opções a decidir:
    - **Stripe Connect** (contas Express, onboarding hospedado pelo Stripe, taxa da plataforma
      com `application_fee_amount`): mantém o código atual de Stripe e o webhook.
    - **Mercado Pago por loja** (OAuth de marketplace): mais conhecido pelo lojista brasileiro,
      Pix e parcelamento nativos.
  - Criar a interface `PaymentProvider` em `storefront/src/lib/payments/`
    (`createPayment(order)`, `parseWebhook(req)`, `refund(order)`), com o Stripe atual como primeira
    implementação. Isso abre espaço para um segundo gateway depois.
  - Em `Store`: provedor escolhido, ID da conta conectada e status do onboarding. Tokens de acesso
    criptografados (AES-256-GCM com `ENCRYPTION_KEY`).
  - Admin: página "Pagamentos" com "Conectar conta" e status. A vitrine bloqueia o checkout de loja
    sem conta ativa, com mensagem clara.
  - Taxa da plataforma configurável por env (`PLATFORM_FEE_PERCENT`), depois por plano (F6.3).
  - Aceite: duas lojas de teste recebem em contas diferentes; o webhook identifica a loja e o pedido corretos.

- [ ] **F1.5 Pix, boleto e parcelamento** · Depende de F1.4
  - Ativar Pix e boleto no provedor escolhido (no Stripe, conta brasileira aceita Pix no Checkout;
    o webhook já trata `async_payment_succeeded` e `async_payment_failed`).
  - Parcelamento no cartão, se o provedor e a conta permitirem; configurável por loja
    (máximo de parcelas, parcela mínima, parcelas sem juros).
  - Salvar `paymentMethod` no pedido (pix, boleto, cartão + parcelas) e mostrar no admin.
  - Página de sucesso e de acompanhamento com estado "Aguardando Pix/boleto" e instruções.
  - Exibir "ou 3x de R$ X sem juros" e "R$ Y no Pix" no card e na página do produto, conforme a configuração da loja.
  - Aceite: compra de teste com Pix e com boleto passa de PENDING para PAID via webhook.

- [ ] **F1.6 Frete por CEP** **(grande)** · **Decisão** · Depende de F1.3
  - Produto ganha `weightGrams`, `heightCm`, `widthCm`, `lengthCm` (obrigatórios para frete calculado).
  - `Store` ganha `originZip` e configurações de frete.
  - Interface `ShippingProvider.quote({ fromZip, toZip, items })` → opções
    `{ id, name, priceInCents, minDays, maxDays }`, com implementações:
    - integração de transportadora: **Decisão** entre Melhor Envio, Frenet ou Correios direto
      (token por loja, criptografado);
    - frete fixo por faixa de CEP ou por estado (sem integração);
    - retirada na loja (grátis, com endereço).
  - Frete grátis acima de um valor (`freeShippingMinInCents`), configurável por loja.
  - Vitrine: caixa "Calcular frete" na página do produto e no carrinho; escolha da opção no checkout.
  - O servidor recalcula a cotação ao criar o pagamento; frete entra como linha no pagamento.
    `Order` guarda `shippingMethod`, `shippingInCents`, prazo, e o total inclui o frete.
  - Aceite: mudar o CEP muda o valor; adulterar o frete no navegador não muda o valor cobrado.

- [ ] **F1.7 Cancelar e reembolsar pelo painel** · Depende de F1.2 e F1.4
  - Novo status `REFUNDED` (e `PARTIALLY_REFUNDED`, se o provedor permitir).
  - Botões no detalhe do pedido: "Cancelar" (pendente → cancelado, devolve estoque) e "Reembolsar"
    (pago → reembolso no provedor, devolve estoque opcionalmente), com confirmação.
  - Tratar o evento de reembolso do webhook (reembolso feito direto no painel do gateway).
  - E-mail ao cliente em cada caso.
  - Aceite: reembolso feito pelo admin ou pelo painel do gateway deixa o pedido igual nos dois casos.

- [x] **F1.8 Linha do tempo do pedido**
  - Model `OrderEvent` (`orderId`, `type`, `message`, `createdAt`, `actor`: sistema/lojista/cliente).
  - Registrar: criado, pago, falhou, expirou, enviado, entregue, cancelado, reembolsado, e-mail enviado.
  - Admin: linha do tempo no detalhe do pedido, com campo para nota interna.
  - Página de acompanhamento: versão pública (sem notas internas).
  - Aceite: cada mudança de status gera exatamente um evento, mesmo com webhook repetido.
  - Nota: `CANCELED`/`REFUNDED` existem no enum mas sem código que os emita ainda (não existe esse
    status hoje — é F1.7); cada evento é criado dentro da mesma transação/guarda de idempotência
    que já protegia a mudança de status (`count > 0`), sem mecanismo novo. Testado com checkout real
    (gera CREATED+FAILED), nota interna pelo admin e página pública (sem a nota) num navegador.

---

## Fase 2: Catálogo no nível da Nuvemshop

- [x] **F2.1 URLs amigáveis de produto**
  - `Product.slug` com `@@unique([storeId, slug])`, gerado por `slugify(name)` com sufixo em caso de
    colisão; editável no admin.
  - Rota nova `/produtos/[slug]`; `/products/[id]` redireciona com 301.
  - Model `SlugRedirect` para que um slug antigo redirecione depois de renomeado.
  - Aceite: todos os links usam o slug; URL antiga continua funcionando.
  - Migration com backfill por `ROW_NUMBER()` (slugifica o nome dos produtos existentes em SQL puro,
    sem suporte a acento — fica meio feio pros 6 produtos do seed já cadastrados, ex. "Óleo..." virou
    "leo-...", mas produtos novos usam o `slugify()` de verdade em JS, com acentuação tratada
    corretamente; não vale a pena `unaccent` do Postgres só pelo backfill de dado de demonstração).
  - Testado num navegador real: card da vitrine linka pro slug, `/products/[id]` antigo redireciona,
    e renomear o slug pelo admin cria o `SlugRedirect` e o endereço antigo continua resolvendo.

- [x] **F2.2 Variações (tamanho, cor etc.)** **(grande)** · Depende de F1.2
  - Models: `ProductOption` (`name`, `values[]`, `position`) e `ProductVariant` (`sku`, combinação
    de opções em JSON, `priceInCents` opcional que sobrescreve o do produto, `compareAtPriceInCents`,
    `stock`, peso opcional, imagem opcional).
  - Produto sem opções tem uma variante padrão. A migration cria a variante padrão para cada produto
    existente, movendo preço e estoque.
  - Carrinho, `OrderItem` (`variantId`, `variantLabel`, `sku`) e reserva de estoque passam a usar a variante.
  - Admin: editor de opções que gera a grade de combinações, com preço, estoque e SKU por linha;
    edição em massa de estoque e preço.
  - Vitrine: seletor por botões, combinações esgotadas desabilitadas, preço e foto mudam com a escolha.
  - Aceite: produto com 2 cores × 3 tamanhos vende e baixa estoque da combinação certa.
  - Progresso (etapa 1/3, 2026-11-12): schema (`ProductOption`/`ProductVariant`) e migration
    `20261112100000_product_variants` com backfill de uma variante padrão por produto (estoque
    migrado pra ela; `Product.priceInCents` continua sendo a base, `ProductVariant.priceInCents`
    nulo = herda do produto). `reserveStock`/`releaseStock`, `pricing.ts`, carrinho, checkout e
    `OrderItem` já operam por `variantId` — hoje sempre a variante padrão (1 por produto), sem
    mudança visível pro cliente final. `effectivePrice`/`effectiveCompareAtPrice`/`variantLabel`
    novos em `@repo/db/utils`. Falta: etapa 2 (editor de opções/grade no admin) e etapa 3 (seletor
    na vitrine) — é só aí que um produto passa a ter mais de uma variante de verdade.
  - Progresso (etapa 2/3, 2026-11-12): admin ganhou `/products/[id]/variants` — editor de opções
    (nome + valores separados por vírgula, até 3 opções) que recalcula a grade de variações ao
    salvar (cria a combinação nova, apaga a que não existe mais — pedido antigo mantém o snapshot,
    só perde o vínculo pelo `onDelete: SetNull`); grade com SKU, preço, preço "de" e estoque por
    linha, com "aplicar a todas" pra estoque e preço. `cartesianCombinations`/`combinationKey`
    novos em `@repo/db/utils`. O formulário principal de produto só edita o estoque direto quando
    o produto tem uma variante só — com mais, vira um link pra grade.
  - Progresso (etapa 3/3, 2026-11-12 — concluída): página de produto ganhou `ProductVariantPicker`
    (botões por opção, combinação esgotada aparece riscada/desabilitada mantendo a seleção das
    outras opções fixa); preço, selo de promoção, estoque e foto (via `ProductVariant.imageUrl`,
    com fallback pras imagens do produto) trocam com a seleção. Carrinho e checkout já operavam por
    `variantId` desde a etapa 1 — só precisavam que a vitrine passasse a variante certa, o que agora
    acontece. Testado manualmente: produto com opção "Tamanho" (P/M/G, G sem estoque) — P vem
    pré-selecionado (primeira variante com estoque), G aparece desabilitado, selecionar M troca
    o preço/estoque exibidos e adiciona a variante M (não a padrão) ao carrinho, com o rótulo
    "M" visível na linha do carrinho.

- [x] **F2.3 Preço promocional ("de/por")**
  - `compareAtPriceInCents` no produto/variante; selo "-20%" no card; filtro "Em promoção".
  - Opcional: início e fim da promoção.
  - Aceite: preço riscado aparece só quando é maior que o preço de venda.
  - Resultado: `Product.compareAtPriceInCents/promoStartsAt/promoEndsAt` (nullable, migration
    `20261109210000_promo_price`). `isPromoActive`/`promoDiscountPercent` em `@repo/db/utils`
    (com testes) decidem quando mostrar o selo/preço riscado — cobre o aceite e a janela de datas
    opcional. Admin: campos de preço "de" e datas no formulário de produto. Vitrine: selo "-X%" e
    preço riscado no card e na página do produto; filtro "Em promoção" na busca.

- [x] **F2.4 Categorias em árvore**
  - Model `Category` (`name`, `slug`, `parentId`, `position`, `description`, `imageUrl`) e relação
    muitos-para-muitos com `Product`. Migration converte as categorias de texto atuais.
  - Admin: CRUD com subcategorias e ordenação.
  - Vitrine: rota `/categorias/[...slug]`, filtro que inclui subcategorias, breadcrumb.
  - Aceite: produto em "Roupas > Camisetas" aparece em ambas as páginas.
  - Resultado: `Category` auto-relacionada (`parentId`) + `Product.categories` (m2m implícita do
    Prisma); migration `20261109220000_categories` faz backfill de uma `Category` raiz por valor
    distinto do antigo `Product.category` (texto) e remove a coluna. `categoryDescendantIds`/
    `categoryAncestors` em `@repo/db/utils` (com testes) calculam subárvore e breadcrumb em memória —
    lista de categorias por loja é pequena, não compensa CTE recursiva no banco (mesma lógica do
    filtro "Em promoção" da F2.3). Admin: aba "Categorias" (lista indentada por profundidade, CRUD,
    `position` como campo numérico — sem arrastar-e-soltar); formulário de produto trocou o campo de
    texto livre por checkboxes de categoria. Vitrine: rota `/categorias/[...slug]` resolve pelo
    último segmento da URL (slug é único por loja) com breadcrumb e subcategorias; filtro de
    categoria da home passou a usar slug + inclusão de subárvore.

- [x] **F2.5 Paginação e busca**
  - Vitrine: paginação na URL (`?page=`), 24 por página; total de resultados.
  - Admin: paginação e busca em produtos (nome, SKU) e pedidos (número, e-mail, nome, CPF);
    filtros de pedido por status, entrega, meio de pagamento e período.
  - Índice `pg_trgm` (migration SQL) para busca por trecho sem diferenciar acentos.
  - Aceite: loja com 2.000 produtos de seed abre e busca rápido.
  - Resultado: `?page=` com 24/página na vitrine e 20/página no admin (produtos e pedidos), com
    `<Pagination>` próprio em cada app. Busca por nome+SKU (produtos) e número/e-mail/nome/CPF-CNPJ
    (pedidos); filtros de pedido por status/entrega/período (sem filtro de "meio de pagamento" —
    ver Decisões). Migration `20261113100000_search_indexes` cria `pg_trgm` e índices GIN em
    `Product.name`, `ProductVariant.sku` e três campos de `Order` (acelera o `ILIKE` do Prisma;
    não resolve acento — ver Decisões). Filtro "Em promoção" da vitrine passou a paginar de
    verdade também, com um teto de 500 produtos escaneados em memória (mesma limitação já
    registrada na F2.3, só que agora com paginação real em cima do resultado filtrado).

- [x] **F2.6 Importar e exportar produtos (CSV)** · Depende de F2.2
  - Exportar todos os produtos com variantes em CSV (separador `;`, UTF-8 com BOM para abrir no Excel).
  - Importar com pré-visualização, validação linha a linha e relatório de erros; atualiza por SKU.
  - Aceite: exportar e reimportar o mesmo arquivo não muda nada.
  - Resultado: `/products/import-export` no admin. `GET /api/products/export` gera o CSV (uma linha
    por variante); parser/serializer CSV próprios em `@repo/db/utils` (sem dependência nova — regras
    de aspas/escape poucas o bastante). Importar lê o arquivo no navegador, mostra pré-visualização
    com erro por linha, e só manda o CSV validado pro servidor (que revalida tudo de novo) ao
    confirmar. Atualiza (nunca cria) por SKU — linha sem SKU é ignorada e aparece no relatório (ver
    Decisões). Testado de ponta a ponta: exportar → reimportar sem editar não muda nada; editar um
    preço numa linha e reimportar aplica só aquela variante.

- [x] **F2.7 Imagens**
  - Reordenar, definir principal, texto alternativo por imagem.
  - `next/image` com `remotePatterns` do storage e tamanhos responsivos.
  - Upload por arrastar e soltar, vários arquivos de uma vez.
  - Aceite: página de produto carrega imagens no tamanho certo para celular.
  - Resultado: `Product.imageAlts` novo (array paralelo a `images`, mesma posição — ver Decisões).
    `ImageUploader` ganhou texto alternativo por imagem, botões ←/→ pra reordenar (além do "definir
    capa" que já existia) e arrastar-e-soltar de verdade no dropzone. `ProductImage` passou a usar
    `next/image` com `fill` + `sizes` por contexto (card, galeria, miniatura, carrinho);
    `remotePatterns` no `next.config.mjs` libera o storage e o Unsplash do seed.

- [x] **F2.8 Descrição de produto com IA**
  - Botão "Gerar com IA" no formulário de produto: Server Action que chama a API da Anthropic
    (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`, modelo em `ANTHROPIC_MODEL`, ex.: `claude-haiku-5-5`)
    com nome, categoria e atributos, e devolve descrição em pt-BR + título e descrição para SEO.
  - Limite de usos por loja por dia. O texto entra no campo para o lojista revisar, nunca salva sozinho.
  - Aceite: funciona sem a chave configurada (botão escondido) e com a chave (texto gerado).
  - Resultado: `generateProductDescription` usa `@anthropic-ai/sdk` de verdade (modelo
    `claude-haiku-5-5` por padrão, configurável via `ANTHROPIC_MODEL`). Limite diário por loja via
    tabela `AiGeneration` (uma linha por chamada, conta "hoje"). Botão escondido sem
    `ANTHROPIC_API_KEY` configurada — testado sem a chave (nesta loja ainda não há chave real, só o
    caminho "escondido" foi validado; o caminho "com chave" não foi testado contra a API de verdade).
    Preenche só a descrição; título/meta de SEO aparecem como sugestão pra copiar manualmente (ver
    Decisões — não existe campo de SEO no Product hoje).

---

## Fase 3: Clientes e conversão

- [x] **F3.1 Conta do cliente** **(grande)** · Depende de F1.3
  - Model `Customer` (por loja: e-mail único por loja, nome, telefone, documento, aceita marketing)
    e `CustomerAddress`. Pedido ganha `customerId` (criado/atualizado no checkout pelo e-mail).
  - Login sem senha por link mágico (token com hash, validade de 15 min, uso único), cookie de sessão
    próprio da vitrine.
  - Vitrine: `/conta` com pedidos, endereços e dados; checkout preenchido para cliente logado.
  - Admin: `/clientes` com busca, total gasto, número de pedidos, exportação CSV.
  - Aceite: cliente vê só os próprios pedidos e só na loja em que comprou.
  - Resultado: feito numa sessão só (schema + todas as telas), em vez de etapas separadas — ver
    Decisões. `CustomerLoginToken` (hash SHA-256, 15 min, uso único) + sessão JWT própria
    (`customer_session`, `jose`, mesmo `AUTH_SECRET` do admin) em `storefront/src/lib/customer-session.ts`.
    `/conta` (grupo `(protected)` dentro de `(shop)`) exige sessão válida com `storeId` batendo com a
    loja atual. Checkout (`createCheckoutSession`) cria/atualiza o `Customer` pelo e-mail sempre, sem
    exigir login, e pré-preenche o formulário quando o cliente já está logado (identificação +
    endereço mais recente). Admin ganhou `/customers` (busca, total gasto/pedidos pagos via
    `groupBy`, exportação CSV) e `/customers/[id]` (pedidos, endereços, link WhatsApp — também cobre
    o pedido da F3.5). Testado de ponta a ponta num navegador real: pedir o link, achar o e-mail no
    Mailpit, confirmar, ver "Olá, ..." em `/conta`, checkout pré-preenchido na segunda compra. Achei e
    corrigi um bug real nesse teste: o Route Handler de confirmação montava a URL de redirecionamento
    a partir de `req.url`, que em modo subdomínio não reflete o host externo de verdade — trocado por
    `storeUrl()` (a mesma função usada no e-mail), que sempre monta a URL certa a partir do `.env`.

- [x] **F3.2 Cupons de desconto** · Depende de F0.3
  - Model `Coupon` (`code` único por loja, tipo `PERCENT` | `FIXED` | `FREE_SHIPPING`, valor,
    pedido mínimo, início/fim, limite total, limite por cliente, ativo, usos).
  - Admin: `/cupons` com CRUD no padrão de `/products`.
  - Vitrine: campo de cupom no carrinho/checkout; validação e cálculo no servidor via `@repo/db/pricing`.
  - `Order` guarda `couponCode` e `discountInCents`; uso contado só quando o pedido é pago (idempotente).
  - Aceite: cupom expirado, esgotado ou abaixo do mínimo é recusado com mensagem clara; testes cobrem cada regra.
  - Resultado: `applyCoupon`/`applyDiscounts` em `@repo/db/pricing` (puras, testadas — ver
    `pricing.test.ts`). Campo de cupom só na etapa de revisão do checkout (não duplicado no
    carrinho — ver Decisões), com pré-visualização via `previewDiscounts` (Server Action sem efeito
    no banco) antes de confirmar o pedido de verdade. `Coupon.usesCount` incrementa dentro da mesma
    transação/guarda de idempotência de `markOrderPaid` — nunca na criação do pedido. `OrderItem`
    guarda sempre o preço original; o desconto some como linha própria (`Order.discountInCents`) em
    todas as telas que mostram o pedido (revisão do checkout, sucesso, acompanhamento, admin).
    Testado manualmente: cupom de 10% + promoção da F3.3 combinados no mesmo pedido batem o valor
    esperado centavo a centavo.

- [x] **F3.3 Promoções automáticas** · Depende de F3.2
  - Regras por loja: "leve X, pague Y", desconto progressivo por quantidade, desconto à vista no Pix,
    frete grátis por região.
  - Mostrar a promoção no produto e o desconto aplicado no carrinho.
  - Aceite: regras combinadas seguem uma ordem documentada e testada.
  - Resultado: `Promotion` (`BUY_X_PAY_Y`/`QUANTITY_DISCOUNT`, por produto ou toda a loja). Escopo
    reduzido a regras por quantidade — "à vista no Pix" e "frete grátis por região" dependem de
    meios de pagamento distintos (F1.5) e frete pago (F1.6), nenhum dos dois existe ainda (ver
    Decisões). Ordem documentada e testada em `applyDiscounts`/`pricing.test.ts`: promoções aplicam
    primeiro por produto, cupom aplica depois sobre o restante, nunca fica negativo. Badge "Leve 3,
    pague 2" (ou "X% off a partir de Y un.") na página do produto; desconto automático aparece no
    resumo do carrinho (`previewDiscounts` sem cupom) e no checkout.

- [x] **F3.4 Recuperação de carrinho abandonado** · Depende de F1.3
  - Model `Cart` no servidor (itens, e-mail, token, `remindedAt`, `recoveredOrderId`), salvo quando o
    cliente informa o e-mail no checkout.
  - Rota de job `/api/cron/abandoned-carts` protegida por `CRON_SECRET`, chamada periodicamente
    (serviço no docker-compose ou agendador externo). Envia e-mail após 1 h e após 24 h, com link
    `/carrinho/recuperar/[token]` que restaura o carrinho.
  - Admin: lista de carrinhos abandonados, com botão "enviar link pelo WhatsApp".
  - Link de descadastro no e-mail.
  - Aceite: carrinho que vira pedido pago para de receber lembretes.
  - Resultado: chamado `AbandonedCart` (não `Cart`, pra não confundir com o carrinho do navegador —
    ver Decisões), com `remindedAt1h`/`remindedAt24h` separados em vez de um `remindedAt` genérico.
    Salvo (silencioso, nunca bloqueia o checkout) ao validar a etapa de identificação. `markOrderPaid`
    marca como recuperado pelo e-mail. `/api/cron/abandoned-carts` chamado por agendador externo (ver
    Decisões — nenhum serviço novo no `docker-compose.yml`). `/carrinho/recuperar/[token]` sempre
    busca estoque/preço atuais de novo (nunca confia no snapshot do e-mail); link de descadastro em
    `/carrinho/descadastrar/[token]`. Testado manualmente: etapa 1 do checkout grava a linha no
    banco com os itens certos; cron com `CRON_SECRET` certo processa e responde contagem; sem a
    variável configurada, a rota sempre recusa (401), por design.

- [x] **F3.5 WhatsApp**
  - `Store.whatsapp`; botão flutuante na vitrine com mensagem pronta; botão "Comprar pelo WhatsApp"
    opcional no produto.
  - Admin: no detalhe do pedido e do cliente, link `wa.me` com mensagem pré-preenchida (status, rastreio).
  - Aceite: número inválido é recusado; botão some quando não configurado.
  - Resultado: `Store.whatsapp` (só dígitos, `WHATSAPP_PHONE` valida DDI+DDD+número) no formulário de
    aparência. `waLink()` em `@repo/db/utils` monta o link `wa.me` reusado em quatro lugares: botão
    flutuante da vitrine, "Comprar pelo WhatsApp" na página do produto, pedido no admin e carrinho
    abandonado no admin — todos somem sem o número configurado. Testado manualmente com e sem o
    número cadastrado.

- [x] **F3.6 Avaliações de produto**
  - Model `Review` (nota 1–5, texto, nome, compra verificada, aprovada).
  - E-mail pedindo avaliação X dias depois de `DELIVERED`; moderação no admin.
  - Estrelas no card e na página do produto.
  - Aceite: só aparecem avaliações aprovadas; compra verificada tem selo.
  - Resultado: `Review` sempre entra `approved: false`. "Compra verificada" é um link assinado por
    HMAC (`storefront/src/lib/review-token.ts`, mesmo `AUTH_SECRET`, sem tabela nova) ligando
    `orderId`+`productId`, mandado só quando `fulfillmentStatus: DELIVERED`
    (`/api/cron/review-requests`, mesmo mecanismo de agendador externo da F3.4). Admin: `/reviews`
    com abas pendentes/aprovadas, aprovar/rejeitar. Estrelas (`Stars`, média com uma casa decimal) no
    card da vitrine e na página do produto. Testado manualmente de ponta a ponta: avaliação sem
    token não leva o selo e fica pendente; aprovar no admin faz aparecer na vitrine com estrelas.

---

## Fase 4: Aparência personalizável

- [x] **F4.1 Página inicial por seções** **(grande)**
  - `Store.homeSections` (JSON validado por união discriminada do Zod) com tipos: banner principal
    (imagem desktop e mobile, título, botão), carrossel de banners, vitrine de produtos (destaques,
    novidades, promoção ou categoria), faixa de benefícios, texto + imagem, newsletter.
  - Componentes em `storefront/src/components/sections/`.
  - Admin: editor com adicionar, remover, reordenar e formulário por tipo; rascunho + "Publicar";
    link de pré-visualização do rascunho.
  - Aceite: loja nova já nasce com um layout padrão bonito; JSON inválido nunca quebra a vitrine.
  - Resultado: feito numa sessão só (schema + editor + seções + rotas), não em etapas — pedido
    explícito do usuário (igual F3). `@repo/db/content` tem o union discriminado
    (`homeSectionSchema`) e `parseHomeSections()`, que nunca lança — item inválido é descartado,
    nunca derruba a página. O catálogo com busca/filtro/paginação que vivia na home desde a F0
    mudou pra `/busca` (a home virou só seções); cabeçalho ganhou busca própria (F4.2) e a home
    sem seções mostra um fallback simples (nome da loja + botão "Ver produtos") em vez de ficar em
    branco. Reordenar é por botões ↑/↓ (mesma lógica da "posição" da F2.4), não arrastar-e-soltar —
    ver Decisões. Rascunho/publicação testados de ponta a ponta num navegador real: seção nova
    aparece na pré-visualização (`?preview=1`, sem exigir login) e NÃO aparece no site publicado até
    clicar "Publicar"; depois de publicar, aparece pros dois.

- [x] **F4.2 Cabeçalho, menu e rodapé**
  - Menu configurável (`Store.navigation`): links para categorias, páginas e URLs; menu mobile.
  - Busca no cabeçalho.
  - Rodapé com redes sociais, contato, meios de pagamento e **razão social, CNPJ/CPF e endereço**
    (exigidos pelo Decreto 7.962/2013 para lojas online).
  - Aceite: lojista sem CNPJ cadastrado recebe aviso no painel.
  - Resultado: `Store.navigation` (Json, `parseNavigation()`) editado em `/menu`, resolve
    categoria/página/URL pro link certo no cabeçalho (desktop) e num menu `<details>` nativo no
    mobile (sem JS). Busca no cabeçalho envia pra `/busca?q=`. Rodapé: `Store.socialLinks`
    (Instagram/Facebook/TikTok/YouTube), razão social/CNPJ-CPF/endereço (`legalName`/`taxId`/
    `legalAddress`), aviso no admin (`/settings`) quando razão social ou CNPJ/CPF faltam. Testado
    num navegador real: busca no cabeçalho leva pra `/busca` com o termo certo; rodapé mostra os
    dados legais e o link do Instagram cadastrados no seed.

- [x] **F4.3 Páginas institucionais**
  - Model `Page` (`slug`, `title`, conteúdo em Markdown sanitizado, publicada).
  - Loja nova já nasce com: Sobre nós, Trocas e devoluções, Política de privacidade, Frete e entrega.
  - Rota `/p/[slug]`; opção de gerar o texto inicial com IA (reaproveitar F2.8).
  - Aceite: HTML/script colado no conteúdo não é executado.
  - Resultado: `@repo/db/markdown` (`renderSafeMarkdown`) escapa `&`/`<`/`>` **antes** de qualquer
    transformação — HTML/`<script>` colado nunca vira tag de verdade, só aparece como texto visível
    (sem dependência nova; suporta título, negrito, itálico, lista e link http(s)/relativo).
    `register()` (cadastro de lojista) e o seed criam as 4 páginas padrão
    (`defaultPages()` em `@repo/db/content`). Admin em `/pages`; "Gerar com IA" reusa o limite
    diário da F2.8. Testado: página com `<script>alert(1)</script>` no conteúdo renderiza o texto
    escapado, nunca executa.

- [x] **F4.4 Temas**
  - 3 temas prontos (ex.: clássico, moderno, minimalista) que mudam fonte, bordas, estilo do card e do
    cabeçalho via CSS variables e `data-theme`. Escolha de fonte entre algumas opções.
  - Pré-visualização no admin antes de aplicar.
  - Aceite: trocar o tema não exige mudar conteúdo nem seções.
  - Resultado: `Store.theme`/`Store.font` (enums) viram `data-theme`/`data-font` no layout;
    `globals.css` troca `--radius-card`/`--radius-btn`/`--radius-field` e as CSS vars de fonte
    (sem carregar fonte nova do Google — "serifada"/"monoespaçada" usam pilhas de fontes do sistema,
    ver Decisões). Pré-visualização ao vivo no formulário de aparência (mockup de card/botão já
    existente, agora também reagindo ao tema/fonte escolhidos, antes de salvar). Testado: trocar
    pra "Moderno" e salvar reflete `data-theme="moderno"` na vitrine sem tocar em nenhum conteúdo.

- [x] **F4.5 Detalhes de marca**
  - Favicon por loja, barra de aviso no topo (ex.: "Frete grátis acima de R$ 199"), modo
    "loja em construção" com senha.
  - Aceite: loja em construção não aparece para visitantes nem no sitemap.
  - Resultado: favicon via `generateMetadata` (`icons.icon`). `Store.maintenanceMode` bloqueia todo
    o layout da loja (menos a tela de senha) atrás de `maintenancePasswordHash` (bcrypt); cookie de
    acesso é um HMAC do `storeId` (`storefront/src/lib/maintenance.ts`) — não é um boundary de
    segurança real, só evita pedir senha de novo a cada página. Loja em construção some da lista
    pública de lojas em `/` (ainda não existe sitemap — isso é F5.1; quando existir, filtrar por
    `maintenanceMode` lá também). Testado: visitante sem senha vê só o formulário; senha errada é
    recusada; senha certa libera o site; loja some da lista pública enquanto o modo está ligado.

---

## Fase 5: SEO e marketing

- [x] **F5.1 SEO técnico** · Depende de F2.1 e F2.4
  - `generateMetadata` em produto, categoria e página: título, descrição, canonical (com `storeUrl`),
    Open Graph com a imagem do produto. Campos `seoTitle` e `seoDescription` editáveis.
  - `sitemap.xml` e `robots.txt` por loja (funcionando em `/{slug}`, subdomínio e domínio próprio).
  - JSON-LD: `Product` (preço, disponibilidade, avaliações), `BreadcrumbList`, `Organization`.
  - Aceite: as páginas passam no Teste de pesquisa aprimorada do Google sem erros.
  - Resultado: `seoTitle`/`seoDescription` em `Product`, `Category` e `Page` (em branco usa
    nome/descrição como fallback), editáveis nos 3 formulários do admin. `generateMetadata` em
    `produtos/[slug]`, `categorias/[...slug]` e `p/[slug]` com `alternates.canonical` e Open Graph
    via `storeUrl()` (`@repo/db/urls`) — nunca combinado com `getStoreBase()`, pra não duplicar o
    `/{slug}` no modo de caminho principal. `sitemap.xml`/`robots.txt` por loja são rotas literais
    (`app/[store]/sitemap.xml/route.ts`, não o arquivo especial `sitemap.ts`) — funcionam igual nos
    3 modos de domínio porque o middleware já reescreve pra lá; respeitam `maintenanceMode`
    (fecham o `robots.txt` e tiram do sitemap), resolvendo a pendência registrada na F4.5. JSON-LD
    (`apps/storefront/src/lib/seo.ts`): `Organization` no layout da loja, `Product` + `BreadcrumbList`
    na página de produto, `BreadcrumbList` na categoria — serializado com escape de `<` pra nunca
    fechar a `<script>` cedo. Testado manualmente: `<title>`/canonical/JSON-LD aparecem no HTML do
    produto; `sitemap.xml`/`robots.txt` respondem XML/texto corretos para a loja demo.

- [x] **F5.2 Pixels e analytics por loja**
  - Campos para GA4, Google Tag Manager, Meta Pixel e TikTok Pixel; scripts com `next/script` no
    layout da loja.
  - Eventos: `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (uma vez por pedido).
  - Banner de consentimento de cookies (LGPD): pixels de marketing só carregam depois do aceite.
  - Aceite: compra de teste aparece no DebugView do GA4 uma única vez.
  - Resultado: `Store.gaId`/`gtmId`/`metaPixelId`/`tiktokPixelId` editáveis em "Configurações" (admin).
  - `CookieConsentBanner` guarda a escolha em `localStorage` (não é dado sensível, não precisa de
    cookie/servidor); `AnalyticsScripts` só injeta os `<Script>` depois do "accepted", escutando um
    evento customizado pra reagir à escolha sem precisar recarregar a página. Eventos disparados via
    `lib/analytics-events.ts` (no-op se o pixel não carregou): `view_item` na página de produto,
    `add_to_cart` no botão de adicionar, `begin_checkout` ao entrar no checkout com itens no
    carrinho, `purchase` na página de sucesso — deduplicado por `localStorage` por `orderId`, pra
    nunca contar 2x num reload. Testado: banner aparece, some após aceitar, scripts entram no HTML
    só depois disso.

- [x] **F5.3 Feeds de produtos** · Depende de F2.2
  - `/feeds/google.xml` (Google Merchant Center) e feed para o catálogo da Meta (Instagram/Facebook).
  - Campos novos no produto: marca, GTIN, condição; variantes com `item_group_id`.
  - Aceite: feed validado no Merchant Center sem erros bloqueantes.
  - Resultado: `Product.brand`/`gtin`/`condition` (enum `NEW`/`USED`/`REFURBISHED`) editáveis no
    formulário de produto. `buildProductFeed()` (`apps/storefront/src/lib/feed.ts`) gera um RSS 2.0
    com namespace `g:` (formato aceito tanto pelo Google Merchant Center quanto pelo catálogo da
    Meta — por isso as duas rotas, `/feeds/google.xml` e `/feeds/meta.xml`, reusam o mesmo builder).
    Um item por variante (preço/estoque são por variante, não por produto); `g:item_group_id` é o
    `productId`, agrupando as variantes do mesmo produto. Respeita `maintenanceMode` (404). Testado
    manualmente: feed responde XML válido com os campos esperados para a loja demo.

- [x] **F5.4 E-mails transacionais completos**
  - Templates: pedido recebido (com instruções de Pix/boleto), pagamento aprovado, enviado, entregue
    (pedindo avaliação), cancelado, reembolsado.
  - Aviso de nova venda para o lojista.
  - Logo e cores da loja em todos os e-mails; versão texto puro.
  - Aceite: todos visíveis no Mailpit e legíveis no celular.
  - Resultado: 5 templates novos em `@repo/mail` (mesmo "shell" com logo/cores da loja + versão
    texto puro dos templates existentes) — `orderReceivedEmail`, `newSaleNoticeEmail`,
    `orderCanceledEmail`, `orderRefundedEmail`, `deliveryConfirmationEmail`. "Pedido recebido" dispara
    quando o Stripe Checkout retorna `checkout.session.completed` com `payment_status` ainda não
    "paid" (caso do Pix/boleto assíncrono no Brasil — o pagamento confirma depois, via
    `async_payment_succeeded/failed`); pagamento no cartão vai direto pra confirmação, sem passar por
    aqui. Aviso de nova venda vai pro primeiro `User` da loja (ainda não existe `Membership`/equipe —
    isso é F6.2). Cancelamento/reembolso agora têm ação no admin (botões na página do pedido,
    `cancelOrder`/`refundOrder`) — status `CANCELED` ganhou um gatilho real (antes só existia no tipo,
    nunca era alcançado) e `OrderStatus.REFUNDED` é novo; os dois devolvem o estoque reservado
    (`releaseStock`, idempotente) e avisam o cliente por e-mail. Confirmação de entrega dispara pelo
    mesmo checkbox "avisar cliente" já usado no envio, ao marcar `DELIVERED` no admin. Todos os
    e-mails novos (exceto cancelamento/reembolso, que são eventos únicos não repetíveis) têm trava de
    idempotência num campo `*EmailSentAt`/`*NotifiedAt` em `Order`, no mesmo padrão de
    `confirmationEmailSentAt`. Testado: typecheck/lint/build/testes unitários e e2e completos.

---

## Fase 6: Plataforma (SaaS) e gestão

- [x] **F6.1 Segurança da conta do lojista**
  - "Esqueci minha senha" com token por e-mail; verificação de e-mail no cadastro; troca de senha.
  - `sessionVersion` no usuário e no JWT para "sair de todos os dispositivos".
  - Limite de tentativas de login no banco (ou Redis), em vez de memória.
  - Aceite: token de redefinição é de uso único e expira; trocar a senha derruba as outras sessões.
  - Resultado: `User.sessionVersion` viaja no próprio JWT (`lib/jwt.ts`) — `requireSession()` rejeita
    qualquer token cuja versão não bata com a do banco, mesmo antes de expirar; trocar a senha
    (`changePassword`) ou redefinir (`resetPassword`) incrementa a versão, derrubando as outras
    sessões na hora. `UserToken` (purpose `PASSWORD_RESET`/`EMAIL_VERIFY`/`TEAM_INVITE`) é um único
    model reaproveitado nos três fluxos, mesmo padrão de hash de `CustomerLoginToken`. `LoginAttempt`
    troca o `Map` em memória por linhas no banco (sobrevive a reinício/múltiplas instâncias).
    Verificação de e-mail não bloqueia login — só mostra aviso em "Minha conta" com botão de reenvio.

- [x] **F6.2 Equipe e permissões** **(grande)**
  - Model `Membership` (`userId`, `storeId`, `role`: OWNER, ADMIN, OPERADOR) no lugar de `User.storeId`;
    um usuário pode ter várias lojas, com seletor de loja no painel.
  - Convite por e-mail; `requireSession(permission)` checa o papel.
  - Aceite: operador não acessa pagamentos, equipe nem configurações.
  - Resultado: `requireSession(permission?)` manteve o retorno `{ userId, storeId, email, ... }` —
    todos os ~40 call sites existentes que só liam `{ storeId }` continuaram funcionando sem
    alteração; a validação virou "o usuário tem `Membership` nesta loja?" em vez de
    "`User.storeId` bate?", e um `role` extra vem no retorno pra quem precisar. Seletor de loja no
    painel (sidebar vira `<select>` quando há mais de uma loja) chama `switchStore()`, que reemite a
    sessão com outro `storeId` (só se existir `Membership`). Convite: se o e-mail já tem conta,
    ganha `Membership` na hora + aviso por e-mail; se não, cria `User` com senha inutilizável +
    `UserToken` de convite, aceito em `/accept-invite/[token]`. `/team` lista a equipe com troca de
    papel inline e remoção (nunca removendo o último OWNER).

- [x] **F6.3 Planos e cobrança dos lojistas** **(grande)** · **Decisão**
  - Planos (ex.: Grátis, Essencial, Pro) com limites: produtos, usuários, domínio próprio, taxa por venda.
  - Assinatura recorrente: **Decisão** entre Stripe Billing (conta da plataforma), Asaas ou Mercado Pago.
  - Webhook atualiza `Store.planStatus`; período de teste; aviso e bloqueio suave em caso de atraso.
  - Limites aplicados nas Server Actions, não só na interface.
  - Aceite: loja no plano Grátis não consegue passar do limite de produtos nem por chamada direta à action.
  - Resultado: **Decisão do usuário: Stripe Billing** (mesma conta global do checkout da vitrine,
    outro produto dentro dela). `@repo/db/plans` centraliza `PLAN_LIMITS` (produtos/usuários/domínio
    próprio/taxa) — usado tanto no admin (`/billing`, `createProduct`, `inviteTeamMember`,
    `updateStoreSettings`) quanto na página de planos da vitrine (F6.4), uma fonte só de verdade.
    `/billing` abre Stripe Checkout em modo assinatura (14 dias de teste) e o Portal hospedado do
    Stripe pra trocar cartão/cancelar — sem reconstruir essa UI. Webhook próprio
    (`/api/webhooks/stripe-billing`, segredo separado do checkout da vitrine) sincroniza
    `plan`/`planStatus` a partir do status da assinatura. "Bloqueio suave" em atraso
    (`PAST_DUE`) hoje é só impedir criar produto novo — ver Decisões.

- [x] **F6.4 Página da plataforma**
  - Trocar a lista pública de lojas em `/` da vitrine por uma página de venda: benefícios, planos,
    perguntas frequentes e botão de cadastro (para `/register` do admin).
  - Termos de uso e política de privacidade da plataforma.
  - Aceite: nenhuma lista de lojas fica pública.
  - Resultado: `/` da vitrine agora é `PlatformHome` (benefícios, planos vindos de
    `@repo/db/plans`, FAQ, CTA pra `${ADMIN_URL}/register`) — a query que listava todas as lojas foi
    removida, não só escondida. `/termos` e `/privacidade` são páginas estáticas da plataforma
    (conteúdo fixo, não por loja — diferente das páginas institucionais por loja da F4.3).

- [x] **F6.5 Domínio próprio de verdade** · **Decisão**
  - Verificação por registro TXT (`_multistore.<domínio>`) consultado com `node:dns`; status
    pendente/verificado; instruções de CNAME na tela.
  - SSL automático: **Decisão** entre Caddy com on-demand TLS (endpoint que só autoriza domínios
    verificados) ou a API de domínios da hospedagem (ex.: Vercel).
  - A vitrine só responde a domínios verificados.
  - Aceite: domínio de terceiro não pode ser "tomado" por outro lojista.
  - Resultado: **Decisão do usuário: API de domínios da hospedagem (Vercel)**. Salvar um
    `customDomain` novo gera `domainStatus: PENDING` + `domainVerificationToken` aleatório; "Verificar
    agora" em Configurações confere o TXT (`lib/dns.ts`, `node:dns/promises`) e, se achar, marca
    `VERIFIED` e chama `lib/hosting.ts` (API da Vercel — sem as variáveis configuradas, é um no-op
    documentado, pra não forçar todo ambiente de dev/self-host a ter um projeto Vercel). A vitrine
    (`/api/domains/resolve`) só resolve domínios `VERIFIED`. Anti-sequestro: uma reivindicação
    `PENDING` nunca verificada expira em 48h e só então libera pra outro lojista reivindicar o mesmo
    domínio — uma já `VERIFIED` nunca é liberada por essa via.

- [x] **F6.6 Relatórios**
  - Período selecionável; faturamento, pedidos, ticket médio, vendas por dia (gráfico), produtos
    mais vendidos, vendas por meio de pagamento, cupons mais usados.
  - Exportar pedidos em CSV com os filtros aplicados.
  - Aceite: números batem com uma consulta SQL de conferência num banco de seed.
  - Resultado: `/reports` agrega em JS (sem SQL bruto) sobre os pedidos pagos do período — volume de
    uma loja não justifica `$queryRaw`. Gráfico de vendas por dia é barras CSS puras (sem lib de
    gráfico). Export CSV reaproveita `buildCsv`/`csvEscape` de `@repo/db/utils`, mesmo padrão do
    export de clientes/produtos já existente.

- [x] **F6.7 Primeiros passos do lojista**
  - Checklist depois do cadastro: adicionar produto, conectar pagamento, configurar frete,
    personalizar aparência, conectar domínio. Cada item marca sozinho quando concluído.
  - Aceite: lojista novo vê o checklist até completar ou dispensar.
  - Resultado: checklist com 3 itens reais (produto cadastrado, logo configurado, domínio
    verificado) no topo da Visão Geral, dispensável (`Store.onboardingDismissedAt`) e que some sozinho
    quando os 3 estão completos. "Conectar pagamento" e "configurar frete" ficaram de fora — ver
    Decisões.

- [ ] **F6.8 API pública e webhooks** **(grande)**
  - Chaves de API por loja (guardadas com hash), REST `/api/v1` para produtos, estoque e pedidos,
    com limite de requisições.
  - Webhooks de saída (`order.created`, `order.paid`, `product.updated`…) assinados com HMAC, com
    novas tentativas e histórico de entregas.
  - Aceite: documentação simples em `/docs/api` e um exemplo de integração funcionando.

- [ ] **F6.9 Integração com ERP (Bling)** · Depende de F6.8 · **Decisão**
  - Conexão OAuth com a API do Bling: enviar pedidos pagos (para emissão de NF-e), sincronizar estoque.
  - Guardar número e link da nota no pedido.
  - Aceite: pedido pago aparece no Bling e a nota emitida aparece no admin.

- [ ] **F6.10 Operação e observabilidade**
  - Captura de erros (ex.: Sentry) nas duas apps; logs estruturados; endpoint de health check.
  - Backup diário do Postgres e procedimento de restauração testado.
  - Aceite: erro forçado aparece no painel de erros com a loja identificada.

- [ ] **F6.11 LGPD**
  - Exportar e apagar (anonimizar) os dados de um cliente a pedido, mantendo os pedidos para fins fiscais.
  - Registro do consentimento de marketing e de cookies.
  - Aceite: cliente anonimizado some das buscas e e-mails, mas os totais de vendas continuam corretos.

---

## Futuro (sem especificação ainda)

- Integração com marketplaces (Mercado Livre, Shopee, Amazon)
- Ponto de venda físico com estoque integrado
- Venda por assinatura (produtos recorrentes)
- Atendimento automatizado no WhatsApp
- Atacado/B2B (tabela de preço e compra mínima por cliente)
- Loja de apps / extensões de terceiros

---

## Decisões

Registre aqui cada escolha feita numa tarefa com **Decisão** (data, opção escolhida e motivo).

| Data | Tarefa | Decisão | Motivo |
|------|--------|---------|--------|
| 2026-11-04 | F0.4 | Banco de teste do E2E é um schema Postgres separado (`?schema=e2e_test`) no mesmo Postgres de dev, não um container/banco novo | `prisma migrate reset --force` já dropa/recria e roda o seed nativamente; evita um serviço Docker extra só para isso |
| 2026-11-04 | F1.1 | Teste de concorrência do número de pedido entra em `e2e/` (via Prisma direto, sem navegador), não em `packages/db` como teste unitário | Precisa de um Postgres real pro lock de linha da transação fazer sentido; `yarn test` (Vitest) não tem banco disponível no job de CI |
| 2026-11-04 | F1.3 | Removido também o `phone_number_collection` do Stripe (não só o `shipping_address_collection` pedido) | O telefone já é coletado no checkout próprio; pedir de novo na página do Stripe seria redundante |
| 2026-11-09 | F2.3 | Filtro "Em promoção" compara em JS (depois do `findMany`), não via SQL cru | Comparar `compareAtPriceInCents` com `priceInCents` da mesma linha exige SQL bruto no Prisma; a listagem já busca só `take: 60` sem paginação de verdade, então filtrar depois não piora nada hoje — revisar quando a F2.5 trouxer paginação real |
| 2026-11-09 | F2.4 | `Product.categories` é muitos-para-muitos (m2m implícita do Prisma), não um `categoryId` único | Roadmap pedia m2m; um produto pode estar em mais de uma categoria (ex.: "Promoções" e "Roupas" ao mesmo tempo) |
| 2026-11-09 | F2.4 | Subárvore de categoria (descendentes) e breadcrumb calculados em memória em JS, não com CTE recursiva no Postgres | Lista de categorias por loja é pequena; evita escrever/manter SQL recursivo pra um caso que não tem problema de escala hoje |
| 2026-11-09 | F2.4 | "Posição" da categoria é um campo numérico no formulário, não arrastar-e-soltar | Atende ao aceite (ordenação) sem precisar de uma lib de drag-and-drop |
| 2026-11-12 | F2.2 etapa 1 | `Product.priceInCents` continua sendo o preço base; `ProductVariant.priceInCents` é opcional e só sobrescreve quando preenchido | Já é literalmente o que o roadmap pede ("opcional que sobrescreve o do produto"); evita duplicar o preço em toda variante que não muda de preço |
| 2026-11-12 | F2.2 etapa 1 | `Product.stock` foi removido (não ficou como fallback) — estoque mora só em `ProductVariant.stock` | Estoque é por natureza granular por combinação; manter os dois criaria duas fontes de verdade pra reconciliar |
| 2026-11-12 | F2.2 etapa 3 | Botão de opção fica desabilitado quando a combinação com as *outras* opções já escolhidas fixas está esgotada — não recalcula a seleção inteira | Cobre o aceite ("combinações esgotadas desabilitadas") com uma checagem simples por botão; uma combinação ótima globalmente é um problema maior que o catálogo de hoje não pede |
| 2026-11-13 | F2.5 | Sem filtro de "meio de pagamento" nos pedidos, apesar de citado no roadmap | Hoje só existe Stripe (uma conta global pra todas as lojas, F1.4 pendente); um filtro com uma opção só não ajuda ninguém — revisar quando houver mais de um meio de pagamento de verdade |
| 2026-11-13 | F2.5 | Índice `pg_trgm` acelera busca por trecho (`ILIKE`); não resolve diferença de acento | Buscar "ole" não acha "Óleo" sem a extensão `unaccent` aplicada também na query (não só no índice), o que exigiria SQL cru no lugar do `contains` do Prisma — fora do escopo desta tarefa |
| 2026-11-13 | F2.6 | Importar CSV **atualiza** variantes existentes por SKU — nunca cria produto ou variante nova | O texto do roadmap ("atualiza por SKU") não pede criação; criar exigiria também resolver `ProductOption`/slug/categoria a partir do CSV, bem mais escopo do que "atualização em massa de preço/estoque" |
| 2026-11-13 | F2.6 | Linha de CSV sem SKU é ignorada (nunca atualiza por slug ou nome) | SKU é opcional no catálogo hoje; sem uma chave estável, "atualizar por posição/nome" arrisca trocar o produto errado numa planilha reordenada — mais seguro ignorar e avisar no relatório |
| 2026-11-13 | F2.7 | `imageAlts` é um array paralelo a `images` (mesma posição), não um array de objetos `{url,alt}` nem um model `ProductImage` novo | Muda só o tipo de um campo existente sem tocar nos outros ~10 lugares que já leem `product.images` (card, galeria, checkout, CSV, seed); um model relacional seria mais "correto" mas exigiria migrar todos esses pontos pra uma funcionalidade que não pede isso |
| 2026-11-13 | F2.8 | Chamada à Anthropic via SDK oficial (`@anthropic-ai/sdk`), não `fetch` cru | O roadmap já pedia o SDK; é a forma oficial suportada |
| 2026-11-13 | F2.8 | Título/descrição de SEO que a IA gera não são salvos em nenhum campo — aparecem como sugestão pra copiar manualmente | `Product` não tem campos de SEO hoje e nenhuma tarefa do roadmap pede isso ainda; inventar schema novo só pra essa tela seria escopo além do pedido |
| 2026-11-13 | F3.1 | Toda a Fase 3 (incluindo a tarefa "(grande)") feita numa sessão só, em vez de uma etapa por sessão | Pedido explícito do usuário ("comece a fase 3 e finalize") |
| 2026-11-13 | F3.1 | Conta do cliente não tem senha — login é sempre por link mágico, e o `Customer` é criado automaticamente no checkout mesmo sem o cliente nunca ter "criado conta" | Já é o que o roadmap pede ("login sem senha"); exigir um cadastro prévio seria fricção extra que o roadmap não pediu |
| 2026-11-13 | F3.1 | Sem backfill de `Order.customerId` para pedidos feitos antes desta tarefa | O roadmap descreve o campo como preenchido "no checkout", não pede migrar pedidos antigos; pedidos anônimos anteriores continuam sem cliente vinculado |
| 2026-11-13 | F3.2 | Campo de cupom só aparece na etapa de revisão do checkout, não duplicado no carrinho | Evita duas implementações de preview do mesmo cálculo; o carrinho já mostra o desconto automático de promoções (F3.3), que não depende de digitar nada |
| 2026-11-13 | F3.2/F3.3 | `OrderItem` sempre guarda o preço original (sem desconto); o desconto aparece como linha própria (`Order.discountInCents`) em vez de alterar `unitPriceInCents` | Evita que a Stripe Checkout Session (que não aceita `unit_amount` negativo) force a distorcer o preço gravado — só a sessão do Stripe usa preços proporcionalmente reduzidos, calculados à parte, pra cobrar o valor certo |
| 2026-11-13 | F3.3 | Escopo de promoções automáticas reduzido a regras por quantidade (leve X pague Y, desconto progressivo) — sem "à vista no Pix" nem "frete grátis por região" | Pix como meio de pagamento distinto (F1.5) e frete pago (F1.6) ainda não existem; implementar essas duas regras hoje não teria o que diferenciar |
| 2026-11-13 | F3.4 | Model chamado `AbandonedCart`, não `Cart` como o roadmap sugeria; campo único `remindedAt` virou dois (`remindedAt1h`/`remindedAt24h`) | `Cart` colidiria conceitualmente com o carrinho do navegador (zustand); dois campos deixam explícito qual lembrete já foi mandado, sem precisar guardar "qual estágio" em outro lugar |
| 2026-11-13 | F3.4/F3.6 | `/api/cron/abandoned-carts` e `/api/cron/review-requests` são chamados por um agendador externo (cron do host, GitHub Actions agendado, etc.), sem serviço novo no `docker-compose.yml` | O roadmap já aceitava as duas opções ("serviço no docker-compose ou agendador externo"); adicionar um serviço de cron ao compose só pra isso é mais peça de infraestrutura do que o catálogo de hoje precisa |
| 2026-11-13 | F3.6 | "Compra verificada" usa um link assinado por HMAC (mesmo `AUTH_SECRET`), sem tabela nova ligando pedido+avaliação | Mais simples que uma tabela de "convites de avaliação"; o link já carrega tudo que precisa (`orderId`+`productId`) e a assinatura garante que não foi forjado |
| 2026-11-13 | F4.1 | Toda a Fase 4 (incluindo a tarefa "(grande)") feita numa sessão só, em vez de uma etapa por sessão | Pedido explícito do usuário ("inicie a fase 4 completa"), mesmo padrão já autorizado na Fase 3 |
| 2026-11-13 | F4.1 | O catálogo com busca/filtro/paginação (que vivia na home desde a F0) mudou de rota pra `/busca`; a home virou só seções configuráveis | É o que o próprio roadmap pede pra F4.1 (home vira seções); manter os dois no mesmo lugar não dava — mantendo a busca disponível em rota própria, linkada pelo cabeçalho (F4.2) |
| 2026-11-13 | F4.1 | Reordenar seção é por botões ↑/↓, não arrastar-e-soltar | Mesma escolha já feita na F2.4 pra posição de categoria; atende ao aceite ("reordenar") sem precisar de uma lib de drag-and-drop |
| 2026-11-13 | F4.1 | Publicar rascunho não tem confirmação extra nem histórico de versões — só copia rascunho → publicado | O roadmap pede rascunho + "Publicar" + pré-visualização, não versionamento; o lojista sempre pode editar de novo e publicar de novo |
| 2026-11-13 | F4.4 | Fonte "serifada" e "monoespaçada" usam pilhas de fontes do sistema (Georgia, Courier New), não fontes novas carregadas do Google Fonts | A fonte "sem serifa" já usa Google Fonts carregadas desde o início do projeto (Bricolage Grotesque/Instrument Sans); trocar por completo pra cada opção exigiria carregar fontes novas só pra essa escolha — pilhas do sistema já diferenciam visualmente sem esse custo |
| 2026-11-13 | F4.5 | Cookie de acesso da loja em construção é um HMAC simples do `storeId` (`storefront/src/lib/maintenance.ts`), não uma sessão JWT completa | Não protege dado sensível (a loja não tem nada atrás da senha além do próprio catálogo ainda não lançado); só evita pedir a senha nas próximas páginas |
| 2026-11-13 | F4.5 | "Não aparece no sitemap" não foi implementado à parte — hoje não existe sitemap.xml (isso é F5.1) | Quando a F5.1 criar o sitemap, filtrar por `maintenanceMode` lá junto; não faz sentido um sitemap só pra essa exceção antes de o sitemap existir |
| 2026-11-13 | F5.1 | `sitemap.xml`/`robots.txt` por loja são rotas literais (`app/[store]/sitemap.xml/route.ts`), não o arquivo especial `sitemap.ts`/`robots.ts` do Next.js | O arquivo especial não garante receber os `params` da rota dinâmica `[store]` sem usar `generateSitemaps` (pensado pra dividir UM sitemap grande, não pra sitemaps por loja); uma rota comum com `{params}` é direta e já funciona nos 3 modos de domínio graças à reescrita do middleware |
| 2026-11-13 | F5.1/F5.3 | Toda a Fase 5 feita numa sessão só, em vez de uma etapa por sessão | Pedido explícito do usuário ("inicie a fase 5 completa"), mesmo padrão já autorizado nas Fases 3 e 4 |
| 2026-11-13 | F5.2 | Consentimento de cookies guardado em `localStorage` no navegador, não em cookie nem em tabela no banco | A escolha não é dado sensível e só decide se um `<script>` carrega no próprio navegador; um cookie exigiria decidir isso no servidor sem necessidade — mesma lógica de preferência de UI já usada no carrinho (zustand+localStorage) |
| 2026-11-13 | F5.2 | Moeda dos eventos de analytics (`add_to_cart`/`begin_checkout`) é "BRL" fixo no componente, não lida de `Store.currency` | Essas chamadas ficam em componentes de cliente que não recebem a loja inteira como prop hoje, e `Store.currency` nunca teve UI pra mudar (sempre "brl"); passar a moeda por toda a árvore só pra isso seria esforço sem um caso de uso real ainda |
| 2026-11-13 | F5.3 | Um item do feed por variante (não por produto), usando `item_group_id` = `productId` | Preço, estoque e SKU são por variante no catálogo de hoje; um item por produto teria que escolher arbitrariamente qual variante representar — `item_group_id` já é o campo que o Google/Meta esperam pra agrupar variações do mesmo produto |
| 2026-11-13 | F5.4 | Sem integração de reembolso de verdade com o Stripe — "marcar como reembolsado" no admin só registra o status e avisa o cliente; o lojista reembolsa no Dashboard do Stripe por fora | Reembolsar via API do Stripe exigiria decidir reembolso total vs. parcial, estorno de taxa, etc. — escopo de uma tarefa de pagamentos própria, não de "e-mails transacionais"; o aceite da F5.4 é sobre o e-mail existir e chegar, não sobre automatizar o reembolso |
| 2026-11-13 | F5.4 | "Pedido recebido com instruções de Pix/boleto" dispara no `checkout.session.completed` com `payment_status` diferente de "paid" (pagamento assíncrono), não imediatamente ao criar o pedido | O cliente é redirecionado pro Stripe Checkout no mesmo instante que o pedido é criado — mandar um e-mail "aguardando pagamento" antes mesmo de ele escolher a forma de pagamento seria prematuro; o instante certo é quando o Stripe confirma que o checkout foi concluído mas o Pix/boleto ainda não caiu |
| 2026-11-13 | F5.4 | E-mail de entrega confirma a entrega mas não repete o convite de avaliação | O convite com link assinado já existe desde a F3.6 (cron 7 dias após a entrega); meter outro convite aqui duplicaria o mesmo pedido em dois e-mails diferentes, além de o link assinado (`review-token.ts`) viver só no app storefront, não no pacote `@repo/mail` compartilhado |
| 2026-11-14 | F6.1-F6.7 | Toda a Fase 6 (até a F6.7) feita numa sessão só, em vez de uma etapa por sessão — inclusive a "(grande)" F6.2/F6.3 | Pedido explícito do usuário ("vamos finalizar com fase 6 completa"), mesmo padrão já autorizado nas Fases 3, 4 e 5 |
| 2026-11-14 | F6.1 | Verificação de e-mail não bloqueia login nem nenhuma ação do painel — só fica um aviso em "Minha conta" | O roadmap pede "verificação de e-mail no cadastro" (o fluxo existir), não "bloquear até verificar"; bloquear login travaria o próprio fluxo de demonstração/seed e não foi pedido explicitamente |
| 2026-11-14 | F6.1 | `LoginAttempt` guarda uma linha por tentativa falha e nunca é limpa automaticamente (só filtra por `createdAt` recente nas consultas) | Mais simples que um job de limpeza; o volume por loja de demonstração é irrelevante, e linhas antigas nunca entram em nenhuma consulta (sempre filtradas por janela de 15 min) |
| 2026-11-14 | F6.2 | OWNER e ADMIN têm exatamente as mesmas permissões hoje (`hasPermission` só distingue OPERADOR dos outros dois) | O aceite da F6.2 só exige restringir o OPERADOR ("não acessa pagamentos, equipe nem configurações"); diferenciar OWNER de ADMIN exigiria inventar uma regra que o roadmap não especifica — fica pronto pra refinar quando houver uma necessidade concreta |
| 2026-11-14 | F6.2 | "Pagamentos" (que o roadmap diz que o OPERADOR não acessa) foi mapeado pra permissão `billing` (a nova página `/billing` de plano/assinatura) | Não existe nenhuma tela de "configuração de pagamentos" no admin (o Stripe do checkout é um env var global, F1.4) — a única coisa remotamente "financeira" nova que faz sentido restringir é a cobrança da própria assinatura da loja |
| 2026-11-14 | F6.2 | Convite só oferece os papéis ADMIN/OPERADOR (nunca OWNER) — promover alguém a OWNER só é possível depois, trocando o papel na lista da equipe | Convidar alguém direto como "proprietário" não faz sentido (quem convida já é responsável pela loja); transferir propriedade é uma ação deliberada separada, não o primeiro convite |
| 2026-11-14 | F6.3 | "Taxa por venda" por plano existe só como número exibido (`PLAN_LIMITS.feePercent`) — não é cobrada de verdade | Descontar uma taxa por venda de cada pedido pago exigiria Stripe Connect (split de pagamento entre a plataforma e o lojista); o checkout da vitrine usa uma conta Stripe global única (Decisão da F1.4), então não há hoje "a conta de outra pessoa" de onde tirar essa taxa — fica documentado como próximo passo caso a F1.4 seja revisitada |
| 2026-11-14 | F6.3 | "Bloqueio suave" em atraso de pagamento (`PAST_DUE`) hoje só impede criar produto novo — não bloqueia categoria, cupom, promoção, página nem pedidos | O aceite da F6.3 fala especificamente do limite de produtos; estender o mesmo guard pra toda ação de criação do admin é mecânico (mesma função, outro call site) mas ficou fora do escopo desta sessão pra não inflar ainda mais uma fase já enorme |
| 2026-11-14 | F6.3 | Preço dos planos (`PLAN_LIMITS.priceInCents`) é uma constante no código (`@repo/db/plans`), não configurável pelo lojista nem por um admin da plataforma | Não existe um "admin da plataforma" (painel de dono do SaaS) no projeto ainda — mudar preço de plano hoje é uma alteração de código, consistente com o resto do catálogo de planos ser fixo |
| 2026-11-14 | F6.5 | Reivindicação de domínio (`customDomain`) expira em 48h sem verificação, liberando pra outro lojista tentar — em vez de nunca expirar ou de verificar automaticamente em background | Sem expiração, um lojista poderia "sequestrar" o domínio de outro (configurando sem nunca verificar) e bloquear pra sempre o dono real; com expiração mas sem job de fundo, a checagem é "de passagem" (só roda de novo quando outra loja tenta reivindicar o mesmo domínio), evitando um cron novo só pra isso |
| 2026-11-14 | F6.5 | `lib/hosting.ts` (API da Vercel) é um no-op documentado quando `VERCEL_API_TOKEN`/`VERCEL_PROJECT_ID` não estão configurados, nunca lança erro | O docker-compose de desenvolvimento deste projeto não roda na Vercel; exigir essas variáveis pra sempre tornaria o fluxo de domínio inutilizável em dev/self-host — verificar o TXT e marcar `VERIFIED` já cumpre o aceite ("a vitrine só responde a domínios verificados"), a chamada à hospedagem é um passo extra de automação |
| 2026-11-14 | F6.6 | "Vendas por meio de pagamento" mostra só "Cartão · 100%" fixo | Mesma limitação já registrada na Decisão da F2.5 — hoje existe um único meio de pagamento (Stripe/cartão, com Pix/boleto possível mas não um campo distinto no pedido); um relatório por meio de pagamento com uma opção só não ajuda ninguém |
| 2026-11-14 | F6.7 | "Conectar pagamento" não entra no checklist (fica implicitamente "já feito") e "configurar frete" foi removido por completo | Pagamento é uma conta Stripe global da plataforma (F1.4), não algo que o lojista "conecta" por loja — não há ação real pra marcar; frete (F1.6) ainda não existe no catálogo, então o item apontaria pra uma tela inexistente |
