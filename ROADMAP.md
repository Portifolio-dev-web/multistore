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

- [ ] **F1.3 Checkout próprio: identificação e entrega** **(grande)**
  - Nova página `/checkout` na vitrine, antes do pagamento, em etapas: (1) e-mail, nome, telefone,
    CPF/CNPJ com validação de dígitos; (2) CEP com preenchimento automático (ViaCEP) e endereço
    completo; (3) resumo e botão "Ir para o pagamento".
  - Campos novos em `Order`: `customerPhone`, `customerDocument`; `shippingAddress` passa a usar um
    formato próprio (`{ name, zip, street, number, complement, district, city, state }`).
    Atualizar `formatAddress` para aceitar o formato novo e o antigo (pedidos existentes).
  - Remover `shipping_address_collection` do Stripe e passar `customer_email`.
  - Layout enxuto (sem menu e sem rodapé), como checkouts de loja. Mobile primeiro.
  - Aceite: não dá para chegar ao pagamento sem dados válidos; dados aparecem no pedido no admin.
  - Progresso: **Etapa 1/3 concluída** (2026-11-04) — `Order.customerPhone`/`customerDocument` no
    schema, `formatAddress` aceitando o formato novo (estruturado) e o antigo (Stripe), validadores
    de CPF/CNPJ e CEP em `@repo/db/utils`, schemas Zod das 3 etapas em
    `apps/storefront/src/lib/validation.ts`, Vitest ligado no `storefront` (antes só tinha no admin
    e no `@repo/db`). Faltam: Etapa 2 (a página `/checkout` em si — exige reestruturar as rotas da
    vitrine em route groups pra isolar o layout sem header/footer) e Etapa 3 (ligar ao
    `createCheckoutSession`, trocar o botão do carrinho, remover `shipping_address_collection`).

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

- [ ] **F1.8 Linha do tempo do pedido**
  - Model `OrderEvent` (`orderId`, `type`, `message`, `createdAt`, `actor`: sistema/lojista/cliente).
  - Registrar: criado, pago, falhou, expirou, enviado, entregue, cancelado, reembolsado, e-mail enviado.
  - Admin: linha do tempo no detalhe do pedido, com campo para nota interna.
  - Página de acompanhamento: versão pública (sem notas internas).
  - Aceite: cada mudança de status gera exatamente um evento, mesmo com webhook repetido.

---

## Fase 2: Catálogo no nível da Nuvemshop

- [ ] **F2.1 URLs amigáveis de produto**
  - `Product.slug` com `@@unique([storeId, slug])`, gerado por `slugify(name)` com sufixo em caso de
    colisão; editável no admin.
  - Rota nova `/produtos/[slug]`; `/products/[id]` redireciona com 301.
  - Model `SlugRedirect` para que um slug antigo redirecione depois de renomeado.
  - Aceite: todos os links usam o slug; URL antiga continua funcionando.

- [ ] **F2.2 Variações (tamanho, cor etc.)** **(grande)** · Depende de F1.2
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

- [ ] **F2.3 Preço promocional ("de/por")**
  - `compareAtPriceInCents` no produto/variante; selo "-20%" no card; filtro "Em promoção".
  - Opcional: início e fim da promoção.
  - Aceite: preço riscado aparece só quando é maior que o preço de venda.

- [ ] **F2.4 Categorias em árvore**
  - Model `Category` (`name`, `slug`, `parentId`, `position`, `description`, `imageUrl`) e relação
    muitos-para-muitos com `Product`. Migration converte as categorias de texto atuais.
  - Admin: CRUD com subcategorias e ordenação.
  - Vitrine: rota `/categorias/[...slug]`, filtro que inclui subcategorias, breadcrumb.
  - Aceite: produto em "Roupas > Camisetas" aparece em ambas as páginas.

- [ ] **F2.5 Paginação e busca**
  - Vitrine: paginação na URL (`?page=`), 24 por página; total de resultados.
  - Admin: paginação e busca em produtos (nome, SKU) e pedidos (número, e-mail, nome, CPF);
    filtros de pedido por status, entrega, meio de pagamento e período.
  - Índice `pg_trgm` (migration SQL) para busca por trecho sem diferenciar acentos.
  - Aceite: loja com 2.000 produtos de seed abre e busca rápido.

- [ ] **F2.6 Importar e exportar produtos (CSV)** · Depende de F2.2
  - Exportar todos os produtos com variantes em CSV (separador `;`, UTF-8 com BOM para abrir no Excel).
  - Importar com pré-visualização, validação linha a linha e relatório de erros; atualiza por SKU.
  - Aceite: exportar e reimportar o mesmo arquivo não muda nada.

- [ ] **F2.7 Imagens**
  - Reordenar, definir principal, texto alternativo por imagem.
  - `next/image` com `remotePatterns` do storage e tamanhos responsivos.
  - Upload por arrastar e soltar, vários arquivos de uma vez.
  - Aceite: página de produto carrega imagens no tamanho certo para celular.

- [ ] **F2.8 Descrição de produto com IA**
  - Botão "Gerar com IA" no formulário de produto: Server Action que chama a API da Anthropic
    (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`, modelo em `ANTHROPIC_MODEL`, ex.: `claude-haiku-5-5`)
    com nome, categoria e atributos, e devolve descrição em pt-BR + título e descrição para SEO.
  - Limite de usos por loja por dia. O texto entra no campo para o lojista revisar, nunca salva sozinho.
  - Aceite: funciona sem a chave configurada (botão escondido) e com a chave (texto gerado).

---

## Fase 3: Clientes e conversão

- [ ] **F3.1 Conta do cliente** **(grande)** · Depende de F1.3
  - Model `Customer` (por loja: e-mail único por loja, nome, telefone, documento, aceita marketing)
    e `CustomerAddress`. Pedido ganha `customerId` (criado/atualizado no checkout pelo e-mail).
  - Login sem senha por link mágico (token com hash, validade de 15 min, uso único), cookie de sessão
    próprio da vitrine.
  - Vitrine: `/conta` com pedidos, endereços e dados; checkout preenchido para cliente logado.
  - Admin: `/clientes` com busca, total gasto, número de pedidos, exportação CSV.
  - Aceite: cliente vê só os próprios pedidos e só na loja em que comprou.

- [ ] **F3.2 Cupons de desconto** · Depende de F0.3
  - Model `Coupon` (`code` único por loja, tipo `PERCENT` | `FIXED` | `FREE_SHIPPING`, valor,
    pedido mínimo, início/fim, limite total, limite por cliente, ativo, usos).
  - Admin: `/cupons` com CRUD no padrão de `/products`.
  - Vitrine: campo de cupom no carrinho/checkout; validação e cálculo no servidor via `@repo/db/pricing`.
  - `Order` guarda `couponCode` e `discountInCents`; uso contado só quando o pedido é pago (idempotente).
  - Aceite: cupom expirado, esgotado ou abaixo do mínimo é recusado com mensagem clara; testes cobrem cada regra.

- [ ] **F3.3 Promoções automáticas** · Depende de F3.2
  - Regras por loja: "leve X, pague Y", desconto progressivo por quantidade, desconto à vista no Pix,
    frete grátis por região.
  - Mostrar a promoção no produto e o desconto aplicado no carrinho.
  - Aceite: regras combinadas seguem uma ordem documentada e testada.

- [ ] **F3.4 Recuperação de carrinho abandonado** · Depende de F1.3
  - Model `Cart` no servidor (itens, e-mail, token, `remindedAt`, `recoveredOrderId`), salvo quando o
    cliente informa o e-mail no checkout.
  - Rota de job `/api/cron/abandoned-carts` protegida por `CRON_SECRET`, chamada periodicamente
    (serviço no docker-compose ou agendador externo). Envia e-mail após 1 h e após 24 h, com link
    `/carrinho/recuperar/[token]` que restaura o carrinho.
  - Admin: lista de carrinhos abandonados, com botão "enviar link pelo WhatsApp".
  - Link de descadastro no e-mail.
  - Aceite: carrinho que vira pedido pago para de receber lembretes.

- [ ] **F3.5 WhatsApp**
  - `Store.whatsapp`; botão flutuante na vitrine com mensagem pronta; botão "Comprar pelo WhatsApp"
    opcional no produto.
  - Admin: no detalhe do pedido e do cliente, link `wa.me` com mensagem pré-preenchida (status, rastreio).
  - Aceite: número inválido é recusado; botão some quando não configurado.

- [ ] **F3.6 Avaliações de produto**
  - Model `Review` (nota 1–5, texto, nome, compra verificada, aprovada).
  - E-mail pedindo avaliação X dias depois de `DELIVERED`; moderação no admin.
  - Estrelas no card e na página do produto.
  - Aceite: só aparecem avaliações aprovadas; compra verificada tem selo.

---

## Fase 4: Aparência personalizável

- [ ] **F4.1 Página inicial por seções** **(grande)**
  - `Store.homeSections` (JSON validado por união discriminada do Zod) com tipos: banner principal
    (imagem desktop e mobile, título, botão), carrossel de banners, vitrine de produtos (destaques,
    novidades, promoção ou categoria), faixa de benefícios, texto + imagem, newsletter.
  - Componentes em `storefront/src/components/sections/`.
  - Admin: editor com adicionar, remover, reordenar e formulário por tipo; rascunho + "Publicar";
    link de pré-visualização do rascunho.
  - Aceite: loja nova já nasce com um layout padrão bonito; JSON inválido nunca quebra a vitrine.

- [ ] **F4.2 Cabeçalho, menu e rodapé**
  - Menu configurável (`Store.navigation`): links para categorias, páginas e URLs; menu mobile.
  - Busca no cabeçalho.
  - Rodapé com redes sociais, contato, meios de pagamento e **razão social, CNPJ/CPF e endereço**
    (exigidos pelo Decreto 7.962/2013 para lojas online).
  - Aceite: lojista sem CNPJ cadastrado recebe aviso no painel.

- [ ] **F4.3 Páginas institucionais**
  - Model `Page` (`slug`, `title`, conteúdo em Markdown sanitizado, publicada).
  - Loja nova já nasce com: Sobre nós, Trocas e devoluções, Política de privacidade, Frete e entrega.
  - Rota `/p/[slug]`; opção de gerar o texto inicial com IA (reaproveitar F2.8).
  - Aceite: HTML/script colado no conteúdo não é executado.

- [ ] **F4.4 Temas**
  - 3 temas prontos (ex.: clássico, moderno, minimalista) que mudam fonte, bordas, estilo do card e do
    cabeçalho via CSS variables e `data-theme`. Escolha de fonte entre algumas opções.
  - Pré-visualização no admin antes de aplicar.
  - Aceite: trocar o tema não exige mudar conteúdo nem seções.

- [ ] **F4.5 Detalhes de marca**
  - Favicon por loja, barra de aviso no topo (ex.: "Frete grátis acima de R$ 199"), modo
    "loja em construção" com senha.
  - Aceite: loja em construção não aparece para visitantes nem no sitemap.

---

## Fase 5: SEO e marketing

- [ ] **F5.1 SEO técnico** · Depende de F2.1 e F2.4
  - `generateMetadata` em produto, categoria e página: título, descrição, canonical (com `storeUrl`),
    Open Graph com a imagem do produto. Campos `seoTitle` e `seoDescription` editáveis.
  - `sitemap.xml` e `robots.txt` por loja (funcionando em `/{slug}`, subdomínio e domínio próprio).
  - JSON-LD: `Product` (preço, disponibilidade, avaliações), `BreadcrumbList`, `Organization`.
  - Aceite: as páginas passam no Teste de pesquisa aprimorada do Google sem erros.

- [ ] **F5.2 Pixels e analytics por loja**
  - Campos para GA4, Google Tag Manager, Meta Pixel e TikTok Pixel; scripts com `next/script` no
    layout da loja.
  - Eventos: `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (uma vez por pedido).
  - Banner de consentimento de cookies (LGPD): pixels de marketing só carregam depois do aceite.
  - Aceite: compra de teste aparece no DebugView do GA4 uma única vez.

- [ ] **F5.3 Feeds de produtos** · Depende de F2.2
  - `/feeds/google.xml` (Google Merchant Center) e feed para o catálogo da Meta (Instagram/Facebook).
  - Campos novos no produto: marca, GTIN, condição; variantes com `item_group_id`.
  - Aceite: feed validado no Merchant Center sem erros bloqueantes.

- [ ] **F5.4 E-mails transacionais completos**
  - Templates: pedido recebido (com instruções de Pix/boleto), pagamento aprovado, enviado, entregue
    (pedindo avaliação), cancelado, reembolsado.
  - Aviso de nova venda para o lojista.
  - Logo e cores da loja em todos os e-mails; versão texto puro.
  - Aceite: todos visíveis no Mailpit e legíveis no celular.

---

## Fase 6: Plataforma (SaaS) e gestão

- [ ] **F6.1 Segurança da conta do lojista**
  - "Esqueci minha senha" com token por e-mail; verificação de e-mail no cadastro; troca de senha.
  - `sessionVersion` no usuário e no JWT para "sair de todos os dispositivos".
  - Limite de tentativas de login no banco (ou Redis), em vez de memória.
  - Aceite: token de redefinição é de uso único e expira; trocar a senha derruba as outras sessões.

- [ ] **F6.2 Equipe e permissões** **(grande)**
  - Model `Membership` (`userId`, `storeId`, `role`: OWNER, ADMIN, OPERADOR) no lugar de `User.storeId`;
    um usuário pode ter várias lojas, com seletor de loja no painel.
  - Convite por e-mail; `requireSession(permission)` checa o papel.
  - Aceite: operador não acessa pagamentos, equipe nem configurações.

- [ ] **F6.3 Planos e cobrança dos lojistas** **(grande)** · **Decisão**
  - Planos (ex.: Grátis, Essencial, Pro) com limites: produtos, usuários, domínio próprio, taxa por venda.
  - Assinatura recorrente: **Decisão** entre Stripe Billing (conta da plataforma), Asaas ou Mercado Pago.
  - Webhook atualiza `Store.planStatus`; período de teste; aviso e bloqueio suave em caso de atraso.
  - Limites aplicados nas Server Actions, não só na interface.
  - Aceite: loja no plano Grátis não consegue passar do limite de produtos nem por chamada direta à action.

- [ ] **F6.4 Página da plataforma**
  - Trocar a lista pública de lojas em `/` da vitrine por uma página de venda: benefícios, planos,
    perguntas frequentes e botão de cadastro (para `/register` do admin).
  - Termos de uso e política de privacidade da plataforma.
  - Aceite: nenhuma lista de lojas fica pública.

- [ ] **F6.5 Domínio próprio de verdade** · **Decisão**
  - Verificação por registro TXT (`_multistore.<domínio>`) consultado com `node:dns`; status
    pendente/verificado; instruções de CNAME na tela.
  - SSL automático: **Decisão** entre Caddy com on-demand TLS (endpoint que só autoriza domínios
    verificados) ou a API de domínios da hospedagem (ex.: Vercel).
  - A vitrine só responde a domínios verificados.
  - Aceite: domínio de terceiro não pode ser "tomado" por outro lojista.

- [ ] **F6.6 Relatórios**
  - Período selecionável; faturamento, pedidos, ticket médio, vendas por dia (gráfico), produtos
    mais vendidos, vendas por meio de pagamento, cupons mais usados.
  - Exportar pedidos em CSV com os filtros aplicados.
  - Aceite: números batem com uma consulta SQL de conferência num banco de seed.

- [ ] **F6.7 Primeiros passos do lojista**
  - Checklist depois do cadastro: adicionar produto, conectar pagamento, configurar frete,
    personalizar aparência, conectar domínio. Cada item marca sozinho quando concluído.
  - Aceite: lojista novo vê o checklist até completar ou dispensar.

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
