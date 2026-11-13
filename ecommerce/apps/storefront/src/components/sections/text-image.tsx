import type { HomeSection } from "@repo/db/content";

type Props = { section: Extract<HomeSection, { type: "textImage" }> };

export function TextImage({ section }: Props) {
  const imageFirst = section.imagePosition === "left";
  return (
    <section className="grid items-center gap-8 sm:grid-cols-2" data-testid="section-text-image">
      {imageFirst && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.imageUrl} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover" />
      )}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{section.title}</h2>
        <p className="mt-3 whitespace-pre-line text-ink/70">{section.text}</p>
      </div>
      {!imageFirst && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.imageUrl} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover" />
      )}
    </section>
  );
}
