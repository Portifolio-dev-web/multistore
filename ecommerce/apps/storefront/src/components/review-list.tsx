import { Stars } from "./stars";

type Review = { id: string; rating: number; text: string; authorName: string; verifiedPurchase: boolean; createdAt: Date };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-ink/50" data-testid="review-list-empty">Ainda não há avaliações para este produto.</p>;
  }
  return (
    <ul className="space-y-4" data-testid="review-list">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-ink/10 bg-white p-4" data-testid={`review-item-${r.id}`}>
          <div className="flex items-center justify-between gap-3">
            <Stars rating={r.rating} />
            <span className="text-xs text-ink/40">{dateFmt.format(r.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-ink/80">{r.text}</p>
          <p className="mt-2 text-xs font-medium text-ink/50">
            {r.authorName}
            {r.verifiedPurchase && <span className="ml-2 text-emerald-700">✓ Compra verificada</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
