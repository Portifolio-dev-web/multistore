import Link from "next/link";
import type { HomeSection } from "@repo/db/content";

type Props = { section: Extract<HomeSection, { type: "bannerCarousel" }> };

// Carrossel simples por scroll horizontal (sem JS) — snap nativo do CSS.
export function BannerCarousel({ section }: Props) {
  return (
    <section className="flex snap-x gap-4 overflow-x-auto pb-2" data-testid="section-banner-carousel">
      {section.banners.map((b, i) => {
        const img = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.imageUrl} alt="" className="h-48 w-full shrink-0 snap-start rounded-2xl object-cover sm:h-64 sm:w-[640px]" />
        );
        return (
          <div key={i} className="shrink-0 snap-start">
            {b.href ? <Link href={b.href}>{img}</Link> : img}
          </div>
        );
      })}
    </section>
  );
}
