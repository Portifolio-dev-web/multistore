# Auditoria de UX — 20 Leis de UX (lawsofux.com)

> Auditoria estática, baseada em leitura de código. Não foram feitos testes com usuários reais nem medições de performance em produção — pontos que dependem disso estão marcados como **🔍 Validar em uso**.

## Etapa 1 — Mapeamento

**Stack:** Monorepo Turborepo/Yarn workspaces. Next.js 14 (App Router) + React + TypeScript + Tailwind CSS, Prisma (`@repo/db`), Zod para validação, Stripe para pagamento. Dois apps:

- **`apps/admin`** — painel do lojista (SSR + Server Actions, `useFormState`).
- **`apps/storefront`** — vitrine pública multi-tenant por `[store]` slug (também SSR + Server Actions, mais alguns componentes client para carrinho/checkout).

**Páginas e rotas principais**

| App | Rotas |
|---|---|
| Admin | `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/accept-invite/[token]`, `(dashboard)/` (visão geral, produtos, categorias, pedidos, clientes, cupons, promoções, carrinhos abandonados, avaliações, relatórios, home, menu, páginas, aparência/settings, equipe, cobrança, desenvolvedores, conta) |
| Storefront | `/[store]` (home), `/[store]/produtos/[slug]`, `/[store]/categorias/[...slug]`, `/[store]/busca`, `/[store]/cart`, `/[store]/checkout` (+ `success`/`cancel`), `/[store]/conta/entrar`, `/[store]/conta/(protected)` (dados, endereços, pedidos), `/[store]/pedido/[token]`, `/[store]/p/[slug]` (páginas institucionais), `/termos`, `/privacidade` |

**Componentes de UI centrais:** `Sidebar` (admin), `PageHeader`, `Pagination` (admin/storefront), `ImageUploader`, formulários (`form-ui.tsx`: `SubmitButton`/`FieldError`/`FormMessage`), `ProductCard`, `ProductVariantPicker`, `ProductGallery`, `NavMenu`, `CartView`, `CheckoutForm`, `OrderTimeline`, `BannerCarousel`, `Stars`.

**Formulários:** login/registro/recuperação de senha (admin e storefront), formulário de produto/categoria/cupom/promoção/página (admin, todos longos e em página única), checkout em 3 passos, endereço, newsletter, review, filtros de busca (GET).

**Fluxos centrais:** cadastro de loja → produto → pedido (admin); navegação → produto → carrinho → checkout 3 etapas → pagamento Stripe → confirmação (storefront); recuperação de carrinho abandonado por link mágico; avaliação pós-compra.

---

## Etapa 2 — Resumo geral

**Nota geral: 7,5/10**

O projeto usa padrões web convencionais, tokens de design consistentes por app (cores/raio/fonte via CSS vars), feedback de formulário presente em quase toda parte, e um checkout multi-etapa bem estruturado com indicador de progresso. Os problemas mais sérios são de acessibilidade/toque em botões pequenos (Fitts), formulários de admin muito longos sem agrupamento visual por etapas (Miller) e ausência de skeleton/loading em algumas listagens (Doherty).

**3 pontos mais fortes**
1. **Tesler + checkout** — autofill de endereço via CEP (`checkout-form.tsx:97-108`) e também no cadastro de produto (nenhuma digitação redundante de categoria pré-selecionada).
2. **Gradiente de objetivo + Zeigarnik no checkout** — stepper visual de 3 passos com estado ativo claro (`checkout-form.tsx:157-167`).
3. **Von Restorff consistente** — CTA primário (`btn-brand`/`btn`) sempre visualmente destacado de ações secundárias (`btn-ghost`/`btn-outline`) nos dois design systems (`globals.css` de cada app).

**3 pontos mais críticos**
1. **Fitts — alvos de toque pequenos**: botões +/− do carrinho (`cart-view.tsx:90-92`, `px-3 py-1.5` ≈ 32px de altura) e setas de reordenar imagem (`image-uploader.tsx:70-71`, texto 10px) ficam abaixo de 44×44px.
2. **Miller — formulários de admin extensos sem agrupamento em etapas**: `product-form.tsx` tem 9 blocos de campos (nome → preço → categorias → promoção → imagens → SEO → feed) em uma única rolagem longa, sem abas/wizard.
3. **Doherty — faltam estados de carregamento em listagens**: `products/page.tsx` e tabelas semelhantes não têm skeleton; apenas o carrinho (`cart-view.tsx:30`) e o checkout (`checkout-form.tsx:68`) têm `animate-pulse`.

---

## Tabela de avaliação das 20 leis

| # | Lei | Status | Evidência | Problema | Recomendação | Prioridade |
|---|---|---|---|---|---|---|
| 1 | Jakob | ✅ Atende | `shop-layout.tsx:37-47` (logo → home), `sidebar.tsx:70-78` (nav lateral padrão) | — | Nenhuma ação necessária. | — |
| 2 | Fitts | ⚠️ Parcial | `cart-view.tsx:90-92`; `image-uploader.tsx:70-74` (botões `px-1`/`text-[10px]`) | Botões de quantidade do carrinho e controles de reordenar imagem são menores que 44×44px, difíceis de tocar no mobile. | Aumentar área de toque (`min-h-11 min-w-11` ou `p-2.5`+ ícone maior) nos controles +/−/remover do carrinho e nos controles de imagem. | Alta |
| 3 | Hick | ✅ Atende | `product-filters.tsx:9-53` (poucos filtros, agrupados); `sidebar.tsx:11-29` (16 itens, mas com permissões filtrando por papel, `sidebar.tsx:44`) | Nav do admin tem 16 itens sem agrupamento visual (nenhum separador entre "catálogo", "vendas", "config"), mas é mitigado pela filtragem por permissão. | Agrupar visualmente a navegação do admin em seções (ex.: separador/label antes de "Equipe/Cobrança/Desenvolvedores"). | Média |
| 4 | Miller | ⚠️ Parcial | `product-form.tsx:50-209` (formulário único, 9 seções); `coupon-form.tsx:24-88` | Formulário de produto é longo e tem blocos conceitualmente distintos (dados, promoção, SEO, feed) sem separação em abas/etapas. | Dividir em abas ("Geral", "Preço/Promoção", "SEO/Feed") ou acordeões recolhíveis, mantendo um único `<form>`. | Média |
| 5 | Tesler | ✅ Atende | `checkout-form.tsx:25-40,97-108` (busca de endereço via CEP); `product-form.tsx:63-64` (slug auto-gerado se vazio); `register-form.tsx:41` (slug da loja gerado do nome) | — | Nenhuma ação necessária. | — |
| 6 | Postel | ⚠️ Parcial | `validation.ts:8-12` `PHONE_BR = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/` | Regex de telefone aceita só formato BR com DDD de 2 dígitos; não tolera variações como `+55 11 91234-5678` ou espaços extras. CEP (`CEP = /^\d{5}-?\d{3}$/`) é razoavelmente tolerante (com/sem hífen). | Normalizar telefone removendo tudo que não é dígito e validar por tamanho (10-11 dígitos) antes do regex rígido, aceitando formatos digitados livremente. | Baixa |
| 7 | Doherty | ⚠️ Parcial | `cart-view.tsx:30`, `checkout-form.tsx:68` (skeleton com `animate-pulse`); `products/page.tsx` (sem loading state); `image-uploader.tsx:86-88` (skeleton só durante upload) | Páginas de listagem do admin (produtos, pedidos, clientes) não têm `loading.tsx` do Next.js nem skeleton — navegação entre páginas de paginação pode parecer travada em conexões lentas. | Adicionar `loading.tsx` simples (skeleton de tabela) nas rotas `(dashboard)/products`, `/orders`, `/customers`. | Média |
| 8 | Navalha de Occam | ✅ Atende | `pagination.tsx` idêntico conceitualmente entre admin/storefront, mas não compartilhado — ver nota | Há duplicação de componentes quase idênticos (`admin/components/pagination.tsx` vs `storefront/components/pagination.tsx`, `form-ui.tsx` padrões repetidos) entre os dois apps, por não haver `packages/ui` compartilhado. Não é "funcionalidade redundante" na mesma tela, mas é código duplicado entre apps. | Extrair um `packages/ui` com `Pagination`, `SubmitButton`, `FieldError` compartilhados. | Baixa |
| 9 | Pareto | ✅ Atende | `products/page.tsx:44-47` ("+ Novo produto" e "Importar/exportar" no topo da página mais usada); `shop-layout.tsx:61-62` (carrinho e busca sempre no header) | — | Nenhuma ação necessária. | — |
| 10 | Estética-Usabilidade | ✅ Atende | `globals.css` (admin e storefront) com tokens de cor/raio consistentes via `@layer components` (`.btn`, `.field`, `.card`) | Os dois apps têm paletas e naming de tokens distintos (não compartilham `packages/ui`), o que é aceitável pois são produtos diferentes (admin vs. loja personalizável), mas deve ser observado se crescerem. | Nenhuma ação urgente; considerar `packages/ui` se o design divergir mais. | Baixa |
| 11 | Pico-Final | ⚠️ Parcial | `checkout/success/page.tsx:50-80` (tela de sucesso completa, com resumo e CTAs); `not-found.tsx` de ambos os apps (`apps/admin/.../not-found.tsx`, `apps/storefront/.../not-found.tsx`) | Tela de sucesso é boa (pico positivo). Páginas 404 são minimalistas e corretas, mas não sugerem nenhuma ação contextual (ex.: busca, categorias populares) — pico final fraco em erro. | Adicionar no 404 da loja sugestões de categorias/produtos populares ou campo de busca, não só um link para "Ver todas as lojas". | Baixa |
| 12 | Von Restorff | ✅ Atende | `globals.css` admin: `.btn` (preto sólido) vs `.btn-outline`/`.btn-danger`; storefront: `.btn-brand` vs `.btn-ghost`; `checkout-form.tsx:449` (`btn-brand` no "Ir para o pagamento" vs `btn-ghost` no "Voltar") | — | Nenhuma ação necessária. | — |
| 13 | Posição Serial | ⚠️ Parcial | `sidebar.tsx:11-28` (NAV array: "Visão geral" primeiro, mas "Equipe/Cobrança/Desenvolvedores" — itens de baixa frequência — ficam no fim, o que é correto; porém "Relatórios" e "Página inicial" ficam no meio, misturados) | Itens de alta frequência (Pedidos, Produtos) já estão perto do topo, mas "Configurações de aparência" (alta relevância para a persona lojista) está isolada no meio-fim sem destaque. | Reordenar para manter os 3-4 itens mais usados (Produtos, Pedidos, Clientes) sempre no topo fixo, e usar um separador antes do bloco administrativo (Equipe/Cobrança/Dev). | Baixa |
| 14 | Zeigarnik | ✅ Atende | `checkout-form.tsx:157-167` (stepper mostra passo atual e os que faltam) | — | Nenhuma ação necessária. | — |
| 15 | Gradiente de Objetivo | ✅ Atende | `checkout-form.tsx:159-165` (numeração 1/2/3 com estado preenchido visualmente) | — | Nenhuma ação necessária. | — |
| 16 | Proximidade | ✅ Atende | `address-form.tsx:21-34` (campos relacionados agrupados em grid); `product-form.tsx:75-95,116-154` (preço+estoque juntos, depois promoção) | — | Nenhuma ação necessária. | — |
| 17 | Similaridade | ✅ Atende | Todos os `<input>`/`<select>` usam a classe `.field` consistentemente; todos os CTAs primários usam `.btn`/`.btn-brand` | — | Nenhuma ação necessária. | — |
| 18 | Região Comum | ✅ Atende | `product-form.tsx:98` (categorias em `border` `rounded-lg`); `cart-view.tsx:45` (itens em `rounded-3xl border`); `.card` em `globals.css` admin | — | Nenhuma ação necessária. | — |
| 19 | Conectividade Uniforme | ❌ Não atende | `order-timeline.tsx:23-33` (lista de eventos sem linha/conector vertical entre os itens, nem indicador de status atual vs. passado) | Timeline de pedido é só uma lista simples (`<ul><li>`), sem fio condutor visual (linha vertical, bolinhas conectadas) típico de um stepper de status de pedido — fica difícil perceber a sequência rapidamente. | Adicionar uma linha vertical (`border-l`) + marcador (`before:` ou `<span>` bolinha) conectando os eventos, como um stepper vertical. | Média |
| 20 | Prägnanz | ✅ Atende | `product-variant-picker.tsx:95-123` (seleção de variante com pills simples, tachado quando indisponível); `product-card.tsx:32-49` (badges simples "Esgotado"/"Últimas X"/"-X%") | — | Nenhuma ação necessária. | — |
| — | Doherty (tempo real de resposta) | 🔍 Validar em uso | `lookupCep` em `checkout-form.tsx:25-40` chama ViaCEP ao vivo | Latência real da API ViaCEP e do upload de imagem (`image-uploader.tsx:28`) não é visível em código estático. | Testar em rede 3G simulada (DevTools throttling) o tempo de resposta do CEP e do upload; confirmar que o `cepStatus: "loading"` (linha 100) aparece perceptível e não "pisca" rápido demais. | — |
| — | Hick (admin, tempo de decisão real) | 🔍 Validar em uso | `sidebar.tsx` com 16 itens | Se o tempo de decisão do usuário real para encontrar um item do menu é alto, só se mede com teste de usuário/analytics de clique. | Rodar teste de 5 segundos ou analytics de clique no menu lateral com lojistas reais. | — |

---

## Etapa 3 — As 5 correções com melhor relação impacto × esforço

### 1. Fitts — aumentar área de toque dos controles do carrinho
`apps/storefront/src/components/cart-view.tsx:90-92`

```tsx
// antes
<button type="button" className="px-3 py-1.5" onClick={...} data-testid={`cart-item-decrease-${item.variantId}`}>−</button>

// depois
<button type="button" className="grid h-11 w-11 place-items-center text-base" onClick={...} data-testid={`cart-item-decrease-${item.variantId}`}>−</button>
```
Aplicar o mesmo `h-11 w-11` ao botão `+` (linha 92) e trocar `px-1.5` do "Remover" (linha 94) por `className="px-3 py-2.5 text-sm"`.

### 2. Doherty — skeleton de loading nas listagens do admin
`apps/admin/src/app/(dashboard)/products/page.tsx` — criar `apps/admin/src/app/(dashboard)/products/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="card overflow-x-auto">
      <div className="animate-pulse divide-y divide-line">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-md bg-line" />
            <div className="h-4 w-1/3 rounded bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
```
Replicar para `/orders` e `/customers` (mesmo padrão).

### 3. Postel — telefone mais tolerante na validação
`apps/storefront/src/lib/validation.ts:8-12`

```ts
// antes
phone: z.string().trim().regex(PHONE_BR, "Telefone inválido (ex.: (11) 91234-5678)").transform(onlyDigits),

// depois
phone: z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido (DDD + número)"),
```
Remove a dependência de formatação exata (parênteses/hífen/espaço); valida só a quantidade de dígitos.

### 4. Conectividade Uniforme — conectar visualmente a timeline do pedido
`apps/admin/src/components/order-timeline.tsx:23-33`

```tsx
<ul className="relative space-y-3 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-line">
  {events.map((e) => (
    <li key={e.id} className="relative pl-5 text-sm" data-testid={`order-event-${e.id}`}>
      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-ink" />
      <p className={e.type === "NOTE" ? "italic text-ink/80" : ""}>{e.message}</p>
      <p className="font-mono text-[11px] text-ink/40">{dateFmt.format(e.createdAt)} · {ACTOR_LABEL[e.actor]}</p>
    </li>
  ))}
</ul>
```

### 5. Miller — agrupar o formulário de produto em abas
`apps/admin/src/components/product-form.tsx` — envolver as seções "SEO" (linha 165) e "Feed de produtos" (linha 181) em um `<details>` nativo recolhido por padrão (sem precisar de lib de abas):

```tsx
<details className="border-t border-line pt-5">
  <summary className="label cursor-pointer">SEO (opcional)</summary>
  <div className="mt-3 space-y-4">{/* campos de seoTitle/seoDescription */}</div>
</details>
```
Reduz a rolagem inicial percebida sem exigir estado de abas em React.

---

## Quick wins (< 30 minutos cada)

1. **Fitts** — trocar `px-3 py-1.5` por `h-11 w-11` nos botões +/− do carrinho (`cart-view.tsx:90,92`).
2. **Fitts** — aumentar os botões de mover/capa/remover imagem de `text-[10px] px-1` para `text-xs px-2 py-1.5` (`image-uploader.tsx:70-74`).
3. **Posição Serial** — adicionar um `<hr>`/separador visual na navegação do admin antes de "Equipe" (`sidebar.tsx:68`, inserir um `<div className="my-2 border-t border-bone/10" />` entre os itens operacionais e os administrativos).
4. **Pico-Final** — no 404 da loja (`apps/storefront/src/app/not-found.tsx:8`), trocar o link único por dois CTAs: "Ver todas as lojas" + "Buscar produtos" (reaproveitando o form de busca do header).
5. **Postel** — no CEP (`validation.ts:21`), já aceita com/sem hífen; só falta aplicar o mesmo relaxamento ao campo UF do endereço, que hoje aceita qualquer 2 caracteres maiúsculos sem checar se é sigla válida (não é bug, é tolerância correta — nenhuma mudança necessária, confirma boa prática).

---

*Nenhum arquivo de código foi alterado nesta etapa.*
