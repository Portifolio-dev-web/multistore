import Link from "next/link";
import type { HomeSection } from "@repo/db/content";

type Props = { section: Extract<HomeSection, { type: "hero" }> };

export function Hero({ section }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl" data-testid="section-hero">
      <picture>
        {section.mobileImageUrl && <source media="(max-width: 640px)" srcSet={section.mobileImageUrl} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={section.desktopImageUrl} alt="" className="h-[420px] w-full object-cover sm:h-[480px]" />
      </picture>
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-8 text-white sm:p-12">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{section.title}</h2>
        {section.subtitle && <p className="mt-3 max-w-md text-sm opacity-90 sm:text-base">{section.subtitle}</p>}
        {section.buttonLabel && section.buttonHref && (
          <Link href={section.buttonHref} className="btn-brand mt-6 w-fit">{section.buttonLabel}</Link>
        )}
      </div>
    </section>
  );
}
