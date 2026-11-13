"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";

type GalleryImage = { url: string; alt: string };

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl bg-ink/5">
        <ProductImage
          src={images[active]?.url}
          alt={images[active]?.alt || name}
          className="h-full w-full object-cover"
          sizes="(min-width: 1024px) 500px, 100vw"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              data-testid={`gallery-thumb-${i}`}
              className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition-colors ${i === active ? "border-brand" : "border-transparent opacity-60"}`}
            >
              <ProductImage src={img.url} alt={img.alt || `${name} ${i + 1}`} className="h-full w-full object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
