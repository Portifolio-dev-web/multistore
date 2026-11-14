import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
  linkClassName?: string;
};

export function Pagination({
  page,
  totalPages,
  buildHref,
  className = "mt-4 flex items-center justify-center gap-3",
  linkClassName = "btn-outline",
}: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className={className} data-testid="pagination">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={`${linkClassName} ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        data-testid="pagination-prev"
      >
        ← Anterior
      </Link>
      <span className="font-mono text-sm text-ink/60" data-testid="pagination-status">{page} / {totalPages}</span>
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        className={`${linkClassName} ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        data-testid="pagination-next"
      >
        Próxima →
      </Link>
    </div>
  );
}
