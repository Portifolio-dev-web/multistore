import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { approveReview, rejectReview } from "@/actions/reviews";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default async function ReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const { storeId } = await requireSession();
  const status = searchParams.status === "approved" ? "approved" : "pending";

  const reviews = await prisma.review.findMany({
    where: { storeId, approved: status === "approved" },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Avaliações" subtitle="Modere antes de aparecer na vitrine" />
      <div className="mb-4 flex gap-2 text-sm">
        <a href="?status=pending" className={`btn-ghost ${status === "pending" ? "bg-ink/10" : ""}`} data-testid="reviews-filter-pending">Pendentes</a>
        <a href="?status=approved" className={`btn-ghost ${status === "approved" ? "bg-ink/10" : ""}`} data-testid="reviews-filter-approved">Aprovadas</a>
      </div>
      <ul className="space-y-3" data-testid="admin-reviews-list">
        {reviews.map((r) => (
          <li key={r.id} className="card flex items-start justify-between gap-4 p-5" data-testid={`admin-review-${r.id}`}>
            <div>
              <p className="text-sm font-semibold">{r.product.name} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              <p className="mt-1 text-sm text-ink/70">{r.text}</p>
              <p className="mt-1 text-xs text-ink/50">
                {r.authorName} · {dateFmt.format(r.createdAt)}
                {r.verifiedPurchase && <span className="ml-2 text-emerald-700">✓ Compra verificada</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {status === "pending" && (
                <form action={approveReview.bind(null, r.id)}>
                  <button type="submit" className="btn" data-testid={`approve-review-${r.id}`}>Aprovar</button>
                </form>
              )}
              <form action={rejectReview.bind(null, r.id)}>
                <button type="submit" className="btn-ghost text-red-600" data-testid={`reject-review-${r.id}`}>
                  {status === "pending" ? "Rejeitar" : "Excluir"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {reviews.length === 0 && <p className="py-10 text-center text-ink/50">Nenhuma avaliação {status === "pending" ? "pendente" : "aprovada"}.</p>}
      </ul>
    </>
  );
}
