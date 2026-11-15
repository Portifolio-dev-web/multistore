// F4.1/F4.2: conteúdo configurável da loja guardado em colunas Json — validado aqui com Zod
// (nunca no banco). Puro, sem Prisma/I/O: os parsers nunca lançam, sempre devolvem algo
// renderizável (array vazio/objeto vazio), pra um JSON inválido nunca quebrar a vitrine.
import { z } from "zod";

const id = () => Math.random().toString(36).slice(2, 10);

const heroSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(240).optional(),
  desktopImageUrl: z.string().url(),
  mobileImageUrl: z.string().url().optional(),
  buttonLabel: z.string().max(40).optional(),
  buttonHref: z.string().max(200).optional(),
});

const bannerCarouselSchema = z.object({
  id: z.string(),
  type: z.literal("bannerCarousel"),
  banners: z
    .array(z.object({ imageUrl: z.string().url(), href: z.string().max(200).optional() }))
    .min(1)
    .max(8),
});

const productShowcaseSchema = z.object({
  id: z.string(),
  type: z.literal("productShowcase"),
  title: z.string().max(80).optional(),
  source: z.enum(["featured", "newest", "promo", "category"]),
  categorySlug: z.string().max(80).optional(),
  limit: z.number().int().min(2).max(24).default(8),
});

const benefitsSchema = z.object({
  id: z.string(),
  type: z.literal("benefits"),
  items: z
    .array(z.object({ icon: z.string().max(8).optional(), title: z.string().min(1).max(60), text: z.string().max(140).optional() }))
    .min(1)
    .max(6),
});

const textImageSchema = z.object({
  id: z.string(),
  type: z.literal("textImage"),
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(600),
  imageUrl: z.string().url(),
  imagePosition: z.enum(["left", "right"]).default("left"),
});

const newsletterSchema = z.object({
  id: z.string(),
  type: z.literal("newsletter"),
  title: z.string().max(80).optional(),
  subtitle: z.string().max(160).optional(),
});

export const homeSectionSchema = z.discriminatedUnion("type", [
  heroSchema,
  bannerCarouselSchema,
  productShowcaseSchema,
  benefitsSchema,
  textImageSchema,
  newsletterSchema,
]);

export type HomeSection = z.infer<typeof homeSectionSchema>;
export type HomeSectionType = HomeSection["type"];

export const SECTION_TYPE_LABEL: Record<HomeSectionType, string> = {
  hero: "Banner principal",
  bannerCarousel: "Carrossel de banners",
  productShowcase: "Vitrine de produtos",
  benefits: "Faixa de benefícios",
  textImage: "Texto e imagem",
  newsletter: "Newsletter",
};

/** Nunca lança: seção inválida é descartada, nunca derruba a página inteira. */
export function parseHomeSections(value: unknown): HomeSection[] {
  if (!Array.isArray(value)) return [];
  const out: HomeSection[] = [];
  for (const raw of value) {
    const parsed = homeSectionSchema.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Layout padrão de uma loja nova (F4.1: "já nasce com um layout bonito"). */
export function defaultHomeSections(): HomeSection[] {
  return [
    { id: id(), type: "productShowcase", title: "Novidades", source: "newest", limit: 8 },
    {
      id: id(),
      type: "benefits",
      items: [
        { icon: "🚚", title: "Entrega para todo o Brasil" },
        { icon: "🔒", title: "Pagamento seguro" },
        { icon: "↩️", title: "Troca fácil em até 7 dias" },
      ],
    },
    { id: id(), type: "productShowcase", title: "Em promoção", source: "promo", limit: 8 },
    { id: id(), type: "newsletter", title: "Fique por dentro das novidades" },
  ];
}

// Campo do modelo que o lojista ainda precisa preencher; o admin avisa enquanto ele existir no texto.
export const PAGE_PLACEHOLDER = "[PREENCHER";

const PRIVACY_POLICY_TEMPLATE = `# Política de privacidade

Esta política explica como **[PREENCHER: razão social]**, inscrita no CNPJ/CPF **[PREENCHER: CNPJ ou CPF]** ("nós"), trata os dados pessoais de quem compra ou navega nesta loja, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).

## Quais dados coletamos

- **Identificação e contato:** nome, e-mail, telefone e CPF/CNPJ, informados no checkout.
- **Entrega:** endereço completo.
- **Pedidos:** produtos comprados, valores, status do pagamento e da entrega.
- **Carrinho:** itens e e-mail de quem iniciou uma compra sem concluir.
- **Navegação:** cookies de análise e publicidade, **somente** se você aceitar no aviso de cookies.

Não coletamos nem guardamos dados de cartão: o pagamento é processado diretamente pela Stripe.

## Para que usamos e com qual base legal

- **Processar o pedido, entregar e prestar atendimento:** execução de contrato (LGPD, art. 7º, V).
- **Emitir nota fiscal e guardar registros fiscais:** obrigação legal (art. 7º, II).
- **Lembrar de um carrinho não finalizado e pedir avaliação da compra:** legítimo interesse (art. 7º, IX) — você pode cancelar pelo link no e-mail.
- **Enviar novidades e promoções:** consentimento (art. 7º, I) — só se você marcar a opção.
- **Medir audiência e anúncios (cookies):** consentimento (art. 7º, I).

## Com quem compartilhamos

Apenas com quem é necessário para a compra acontecer: processador de pagamento (Stripe), transportadora, provedor de e-mail transacional e provedor de hospedagem da plataforma. Não vendemos dados pessoais.

## Por quanto tempo guardamos

Dados de pedidos são mantidos pelo prazo exigido pela legislação fiscal (5 anos). Carrinhos não finalizados e tokens de acesso são apagados periodicamente. Os demais dados ficam enquanto você tiver cadastro ou até pedir a exclusão.

## Seus direitos

Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir a portabilidade, revogar consentimentos e pedir a exclusão ou anonimização (art. 18). Na área **Minha conta** você baixa uma cópia dos seus dados e pode pedir a exclusão. Também pode escrever para **[PREENCHER: e-mail do encarregado de dados]** — respondemos em até 15 dias.

Dados de pedidos que a lei obriga a guardar são anonimizados, não apagados.

## Segurança

Usamos conexão criptografada (HTTPS), acesso restrito aos dados e senhas armazenadas com hash.

## Alterações

Esta política pode ser atualizada; a versão vigente fica sempre nesta página. Última atualização: **[PREENCHER: data]**.
`;

// F4.3: toda loja nova já nasce com estas 4 páginas (texto placeholder pro lojista editar)
export function defaultPages(): { slug: string; title: string; content: string }[] {
  return [
    { slug: "sobre-nos", title: "Sobre nós", content: "# Sobre nós\n\nConte aqui a história da sua loja." },
    { slug: "trocas-e-devolucoes", title: "Trocas e devoluções", content: "# Trocas e devoluções\n\nDescreva aqui como funcionam trocas e devoluções." },
    { slug: "politica-de-privacidade", title: "Política de privacidade", content: PRIVACY_POLICY_TEMPLATE },
    { slug: "frete-e-entrega", title: "Frete e entrega", content: "# Frete e entrega\n\nDescreva aqui os prazos e formas de entrega." },
  ];
}

// ---------- F4.2: menu de navegação ----------

const navItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  type: z.enum(["category", "page", "url"]),
  value: z.string().min(1).max(200),
});

export type NavItem = z.infer<typeof navItemSchema>;

export function parseNavigation(value: unknown): NavItem[] {
  if (!Array.isArray(value)) return [];
  const out: NavItem[] = [];
  for (const raw of value) {
    const parsed = navItemSchema.safeParse(raw);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------- F4.2: redes sociais e endereço legal do rodapé ----------

const socialLinksSchema = z.object({
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

export function parseSocialLinks(value: unknown): SocialLinks {
  const parsed = socialLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

const legalAddressSchema = z.object({
  zip: z.string().min(1).max(12),
  street: z.string().min(1).max(120),
  number: z.string().min(1).max(20),
  complement: z.string().max(60).nullish(),
  district: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(2),
});

export type LegalAddress = z.infer<typeof legalAddressSchema>;

export function parseLegalAddress(value: unknown): LegalAddress | null {
  const parsed = legalAddressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
