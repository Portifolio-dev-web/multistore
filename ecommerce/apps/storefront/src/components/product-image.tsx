import Image from "next/image";

type Props = { src?: string | null; alt: string; className?: string; sizes?: string };

export function ProductImage({ src, alt, className, sizes = "(min-width: 1024px) 50vw, 100vw" }: Props) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-brand ${className ?? ""}`}>
        <span className="font-display text-5xl font-bold text-brand-contrast opacity-30">{alt.slice(0, 1)}</span>
      </div>
    );
  }
  return (
    <span className="relative block h-full w-full overflow-hidden">
      <Image src={src} alt={alt} fill sizes={sizes} className={className} />
    </span>
  );
}
