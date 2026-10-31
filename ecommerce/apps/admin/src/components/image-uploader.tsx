"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { uploadProductImage } from "@/actions/uploads";

const MAX_IMAGES = 10;

export function ImageUploader({ initial = [] }: { initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, MAX_IMAGES - urls.length);
    setUploading(list.length);
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadProductImage(fd);
      if ("url" in res) setUrls((u) => [...u, res.url]);
      else setError(res.error);
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const addManual = () => {
    try {
      new URL(manual);
      setUrls((u) => [...u, manual.trim()]);
      setManual("");
    } catch {
      setError("URL inválida.");
    }
  };

  const remove = (i: number) => setUrls((u) => u.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => setUrls((u) => [u[i], ...u.filter((_, idx) => idx !== i)]);

  return (
    <div data-testid="image-uploader">
      <input type="hidden" name="images" value={urls.join("\n")} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {urls.map((url, i) => (
          <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-bone" data-testid={`image-item-${i}`}>
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-lime px-1.5 py-0.5 font-mono text-[10px] font-medium">CAPA</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {i > 0 ? (
                <button type="button" onClick={() => makeCover(i)} className="px-1.5 font-mono text-[10px] text-bone hover:text-lime" data-testid={`image-make-cover-${i}`}>capa</button>
              ) : <span />}
              <button type="button" onClick={() => remove(i)} className="px-1.5 font-mono text-[10px] text-bone hover:text-red-300" data-testid={`image-remove-${i}`}>remover</button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} className="aspect-square animate-pulse rounded-lg bg-line" />
        ))}
        {urls.length + uploading < MAX_IMAGES && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line text-center transition-colors hover:border-ink/40" data-testid="image-upload-dropzone">
            <span className="font-mono text-[11px] text-ink/50">+ enviar<br />fotos</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
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
