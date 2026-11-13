"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { uploadProductImage } from "@/actions/uploads";

const MAX_IMAGES = 10;

type Img = { url: string; alt: string };

export function ImageUploader({ initialImages = [], initialAlts = [] }: { initialImages?: string[]; initialAlts?: string[] }) {
  const [images, setImages] = useState<Img[]>(initialImages.map((url, i) => ({ url, alt: initialAlts[i] ?? "" })));
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, MAX_IMAGES - images.length);
    if (list.length === 0) return;
    setError(null);
    setUploading(list.length);
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadProductImage(fd);
      if ("url" in res) setImages((imgs) => [...imgs, { url: res.url, alt: "" }]);
      else setError(res.error);
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const addManual = () => {
    try {
      new URL(manual);
      setImages((imgs) => [...imgs, { url: manual.trim(), alt: "" }]);
      setManual("");
    } catch {
      setError("URL inválida.");
    }
  };

  const remove = (i: number) => setImages((imgs) => imgs.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => setImages((imgs) => [imgs[i], ...imgs.filter((_, idx) => idx !== i)]);
  const move = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const next = [...imgs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const setAlt = (i: number, alt: string) => setImages((imgs) => imgs.map((img, idx) => (idx === i ? { ...img, alt } : img)));

  return (
    <div data-testid="image-uploader">
      <input type="hidden" name="images" value={images.map((i) => i.url).join("\n")} />
      <input type="hidden" name="imageAlts" value={images.map((i) => i.alt).join("\n")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.url + i} className="rounded-lg border border-line bg-bone p-2" data-testid={`image-item-${i}`}>
            <div className="group relative aspect-square overflow-hidden rounded-md">
              <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-lime px-1.5 py-0.5 font-mono text-[10px] font-medium">CAPA</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 font-mono text-[10px] text-bone hover:text-lime disabled:opacity-30" data-testid={`image-move-left-${i}`}>←</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="px-1 font-mono text-[10px] text-bone hover:text-lime disabled:opacity-30" data-testid={`image-move-right-${i}`}>→</button>
                  {i > 0 && <button type="button" onClick={() => makeCover(i)} className="px-1 font-mono text-[10px] text-bone hover:text-lime" data-testid={`image-make-cover-${i}`}>capa</button>}
                </div>
                <button type="button" onClick={() => remove(i)} className="px-1.5 font-mono text-[10px] text-bone hover:text-red-300" data-testid={`image-remove-${i}`}>remover</button>
              </div>
            </div>
            <input
              value={img.alt}
              onChange={(e) => setAlt(i, e.target.value)}
              placeholder="Texto alternativo"
              className="field mt-1.5 text-xs"
              data-testid={`image-alt-input-${i}`}
            />
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} className="aspect-square animate-pulse rounded-lg bg-line" />
        ))}
        {images.length + uploading < MAX_IMAGES && (
          <label
            className={`grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed text-center transition-colors ${dragOver ? "border-brand bg-brand/5" : "border-line hover:border-ink/40"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            data-testid="image-upload-dropzone"
          >
            <span className="font-mono text-[11px] text-ink/50">arraste ou clique<br />+ enviar fotos</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
              data-testid="image-upload-input"
            />
          </label>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ou cole uma URL https://…" className="field font-mono text-xs" data-testid="image-url-input" />
        <button type="button" onClick={addManual} disabled={!manual} className="btn-outline" data-testid="image-url-add-button">Adicionar</button>
      </div>
      <p className="mt-1.5 text-xs text-ink/50">JPG, PNG, WEBP, AVIF ou GIF até 5 MB. A primeira imagem é a capa.</p>
      {error && <p className="mt-1 text-xs text-red-700" data-testid="image-upload-error">{error}</p>}
    </div>
  );
}
