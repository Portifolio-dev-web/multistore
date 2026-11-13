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

// F4.3: toda loja nova já nasce com estas 4 páginas (texto placeholder pro lojista editar)
export function defaultPages(): { slug: string; title: string; content: string }[] {
  return [
    { slug: "sobre-nos", title: "Sobre nós", content: "# Sobre nós\n\nConte aqui a história da sua loja." },
    { slug: "trocas-e-devolucoes", title: "Trocas e devoluções", content: "# Trocas e devoluções\n\nDescreva aqui como funcionam trocas e devoluções." },
    { slug: "politica-de-privacidade", title: "Política de privacidade", content: "# Política de privacidade\n\nDescreva aqui como os dados dos clientes são tratados." },
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
