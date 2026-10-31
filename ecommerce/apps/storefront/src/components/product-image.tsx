/* eslint-disable @next/next/no-img-element */
type Props = { src?: string | null; alt: string; className?: string };

export function ProductImage({ src, alt, className }: Props) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-brand ${className ?? ""}`}>
        <span className="font-display text-5xl font-bold text-brand-contrast opacity-30">{alt.slice(0, 1)}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
