import type { HomeSection } from "@repo/db/content";
import { Hero } from "./hero";
import { BannerCarousel } from "./banner-carousel";
import { ProductShowcase } from "./product-showcase";
import { Benefits } from "./benefits";
import { TextImage } from "./text-image";
import { Newsletter } from "./newsletter";

type Props = { section: HomeSection; storeId: string; storeSlug: string; base: string };

// Switch simples por `type` — cada seção já chegou validada por `parseHomeSections`
// (JSON inválido nunca chega aqui: é descartado antes, nunca derruba a página).
export function SectionRenderer({ section, storeId, storeSlug, base }: Props) {
  switch (section.type) {
    case "hero":
      return <Hero section={section} />;
    case "bannerCarousel":
      return <BannerCarousel section={section} />;
    case "productShowcase":
      return <ProductShowcase section={section} storeId={storeId} base={base} />;
    case "benefits":
      return <Benefits section={section} />;
    case "textImage":
      return <TextImage section={section} />;
    case "newsletter":
      return <Newsletter section={section} storeSlug={storeSlug} />;
  }
}
