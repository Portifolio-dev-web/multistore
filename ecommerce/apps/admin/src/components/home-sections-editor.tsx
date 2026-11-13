"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { HomeSection, HomeSectionType } from "@repo/db/content";
import { SECTION_TYPE_LABEL } from "@repo/db/content";
import type { FormState } from "@/lib/form";
import { FormMessage, SubmitButton } from "./form-ui";

const MAX_SECTIONS = 20;
const SECTION_TYPES = Object.keys(SECTION_TYPE_LABEL) as HomeSectionType[];
const newId = () => Math.random().toString(36).slice(2, 10);

function blankSection(type: HomeSectionType): HomeSection {
  switch (type) {
    case "hero":
      return { id: newId(), type: "hero", title: "", desktopImageUrl: "" };
    case "bannerCarousel":
      return { id: newId(), type: "bannerCarousel", banners: [{ imageUrl: "" }] };
    case "productShowcase":
      return { id: newId(), type: "productShowcase", source: "featured", limit: 8 };
    case "benefits":
      return { id: newId(), type: "benefits", items: [{ title: "" }] };
    case "textImage":
      return { id: newId(), type: "textImage", title: "", text: "", imageUrl: "", imagePosition: "left" };
    case "newsletter":
      return { id: newId(), type: "newsletter" };
  }
}

type Props = {
  saveAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  publishAction: () => Promise<void>;
  discardAction: () => Promise<void>;
  initial: HomeSection[];
  hasDraft: boolean;
  categories: { slug: string; label: string }[];
  previewUrl: string;
};

export function HomeSectionsEditor({ saveAction, publishAction, discardAction, initial, hasDraft, categories, previewUrl }: Props) {
  const [state, formAction] = useFormState(saveAction, {});
  const [sections, setSections] = useState<HomeSection[]>(initial);
  const [addType, setAddType] = useState<HomeSectionType>("hero");

  const update = (i: number, patch: Partial<HomeSection>) =>
    setSections((arr) => arr.map((s, idx) => (idx === i ? ({ ...s, ...patch } as HomeSection) : s)));
  const remove = (i: number) => setSections((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setSections((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => setSections((arr) => [...arr, blankSection(addType)]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <p className="text-sm text-ink/60">
          {hasDraft ? "Há um rascunho diferente do que está publicado." : "O rascunho é igual ao que está publicado."}
        </p>
        <div className="flex gap-2">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="btn-ghost" data-testid="home-preview-link">Ver prévia</a>
          <form action={discardAction}>
            <button type="submit" className="btn-ghost" data-testid="home-discard-button">Descartar rascunho</button>
          </form>
          <form action={publishAction}>
            <button type="submit" className="btn" data-testid="home-publish-button">Publicar</button>
          </form>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <FormMessage error={state.error} success={state.success} />
        <input type="hidden" name="sectionsJson" value={JSON.stringify(sections)} />

        <div className="space-y-3">
          {sections.map((section, i) => (
            <div key={section.id} className="card space-y-3 p-5" data-testid={`home-section-${i}`}>
              <div className="flex items-center justify-between">
                <p className="label mb-0">{SECTION_TYPE_LABEL[section.type]}</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-outline px-2 disabled:opacity-30" data-testid={`home-section-up-${i}`}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="btn-outline px-2 disabled:opacity-30" data-testid={`home-section-down-${i}`}>↓</button>
                  <button type="button" onClick={() => remove(i)} className="btn-ghost" data-testid={`home-section-remove-${i}`}>Remover</button>
                </div>
              </div>
              <SectionFields section={section} categories={categories} onChange={(patch) => update(i, patch)} />
            </div>
          ))}
          {sections.length === 0 && <p className="py-8 text-center text-sm text-ink/50">Nenhuma seção ainda.</p>}
        </div>

        {sections.length < MAX_SECTIONS && (
          <div className="flex items-center gap-2">
            <select value={addType} onChange={(e) => setAddType(e.target.value as HomeSectionType)} className="field w-56" data-testid="home-add-type-select">
              {SECTION_TYPES.map((t) => (
                <option key={t} value={t}>{SECTION_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button type="button" onClick={add} className="btn-outline" data-testid="home-add-section-button">+ Adicionar seção</button>
          </div>
        )}

        <div className="flex justify-end border-t border-line pt-5">
          <SubmitButton testId="home-save-draft-button">Salvar rascunho</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function SectionFields({
  section,
  categories,
  onChange,
}: {
  section: HomeSection;
  categories: { slug: string; label: string }[];
  onChange: (patch: Partial<HomeSection>) => void;
}) {
  switch (section.type) {
    case "hero":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={section.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Título" className="field sm:col-span-2" data-testid="field-title" />
          <input value={section.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="field sm:col-span-2" data-testid="field-subtitle" />
          <input value={section.desktopImageUrl} onChange={(e) => onChange({ desktopImageUrl: e.target.value })} placeholder="Imagem desktop (URL)" className="field" data-testid="field-desktop-image" />
          <input value={section.mobileImageUrl ?? ""} onChange={(e) => onChange({ mobileImageUrl: e.target.value })} placeholder="Imagem mobile (opcional)" className="field" data-testid="field-mobile-image" />
          <input value={section.buttonLabel ?? ""} onChange={(e) => onChange({ buttonLabel: e.target.value })} placeholder="Texto do botão (opcional)" className="field" data-testid="field-button-label" />
          <input value={section.buttonHref ?? ""} onChange={(e) => onChange({ buttonHref: e.target.value })} placeholder="Link do botão (ex.: /busca)" className="field" data-testid="field-button-href" />
        </div>
      );
    case "bannerCarousel":
      return (
        <div className="space-y-2">
          {section.banners.map((b, bi) => (
            <div key={bi} className="flex gap-2" data-testid={`banner-row-${bi}`}>
              <input
                value={b.imageUrl}
                onChange={(e) => onChange({ banners: section.banners.map((x, i) => (i === bi ? { ...x, imageUrl: e.target.value } : x)) })}
                placeholder="Imagem (URL)"
                className="field flex-1"
              />
              <input
                value={b.href ?? ""}
                onChange={(e) => onChange({ banners: section.banners.map((x, i) => (i === bi ? { ...x, href: e.target.value } : x)) })}
                placeholder="Link (opcional)"
                className="field flex-1"
              />
              <button type="button" onClick={() => onChange({ banners: section.banners.filter((_, i) => i !== bi) })} className="btn-ghost">Remover</button>
            </div>
          ))}
          {section.banners.length < 8 && (
            <button type="button" onClick={() => onChange({ banners: [...section.banners, { imageUrl: "" }] })} className="btn-outline text-sm">+ Banner</button>
          )}
        </div>
      );
    case "productShowcase":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={section.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Título (opcional)" className="field" data-testid="field-title" />
          <select value={section.source} onChange={(e) => onChange({ source: e.target.value as typeof section.source })} className="field" data-testid="field-source">
            <option value="featured">Destaques (mais recentes)</option>
            <option value="newest">Novidades</option>
            <option value="promo">Em promoção</option>
            <option value="category">Categoria específica</option>
          </select>
          {section.source === "category" && (
            <select value={section.categorySlug ?? ""} onChange={(e) => onChange({ categorySlug: e.target.value })} className="field" data-testid="field-category">
              <option value="">Selecione…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          )}
          <input
            type="number"
            min={2}
            max={24}
            value={section.limit}
            onChange={(e) => onChange({ limit: Number(e.target.value) || 8 })}
            placeholder="Quantidade"
            className="field"
          />
        </div>
      );
    case "benefits":
      return (
        <div className="space-y-2">
          {section.items.map((it, bi) => (
            <div key={bi} className="flex gap-2" data-testid={`benefit-row-${bi}`}>
              <input
                value={it.icon ?? ""}
                onChange={(e) => onChange({ items: section.items.map((x, i) => (i === bi ? { ...x, icon: e.target.value } : x)) })}
                placeholder="Emoji"
                className="field w-16"
              />
              <input
                value={it.title}
                onChange={(e) => onChange({ items: section.items.map((x, i) => (i === bi ? { ...x, title: e.target.value } : x)) })}
                placeholder="Título"
                className="field flex-1"
              />
              <input
                value={it.text ?? ""}
                onChange={(e) => onChange({ items: section.items.map((x, i) => (i === bi ? { ...x, text: e.target.value } : x)) })}
                placeholder="Texto (opcional)"
                className="field flex-1"
              />
              <button type="button" onClick={() => onChange({ items: section.items.filter((_, i) => i !== bi) })} className="btn-ghost">Remover</button>
            </div>
          ))}
          {section.items.length < 6 && (
            <button type="button" onClick={() => onChange({ items: [...section.items, { title: "" }] })} className="btn-outline text-sm">+ Item</button>
          )}
        </div>
      );
    case "textImage":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={section.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Título" className="field sm:col-span-2" data-testid="field-title" />
          <textarea value={section.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Texto" rows={3} className="field sm:col-span-2" data-testid="field-text" />
          <input value={section.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="Imagem (URL)" className="field" data-testid="field-image" />
          <select value={section.imagePosition} onChange={(e) => onChange({ imagePosition: e.target.value as "left" | "right" })} className="field" data-testid="field-position">
            <option value="left">Imagem à esquerda</option>
            <option value="right">Imagem à direita</option>
          </select>
        </div>
      );
    case "newsletter":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={section.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Título (opcional)" className="field" data-testid="field-title" />
          <input value={section.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="field" data-testid="field-subtitle" />
        </div>
      );
  }
}
