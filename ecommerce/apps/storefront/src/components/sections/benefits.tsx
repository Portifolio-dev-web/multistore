import type { HomeSection } from "@repo/db/content";

type Props = { section: Extract<HomeSection, { type: "benefits" }> };

export function Benefits({ section }: Props) {
  return (
    <section className="grid grid-cols-1 gap-6 rounded-3xl bg-ink/5 p-8 sm:grid-cols-3" data-testid="section-benefits">
      {section.items.map((item, i) => (
        <div key={i} className="text-center sm:text-left">
          {item.icon && <span className="text-2xl">{item.icon}</span>}
          <p className="mt-2 font-semibold">{item.title}</p>
          {item.text && <p className="mt-1 text-sm text-ink/60">{item.text}</p>}
        </div>
      ))}
    </section>
  );
}
