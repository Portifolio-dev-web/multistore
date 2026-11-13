export function Stars({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`${size} tracking-tight text-amber-500`} aria-label={`${rating} de 5 estrelas`}>
      {"★".repeat(full)}
      <span className="text-ink/20">{"★".repeat(5 - full)}</span>
    </span>
  );
}
