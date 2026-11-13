"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { NavItem } from "@repo/db/content";
import type { FormState } from "@/lib/form";
import { FormMessage, SubmitButton } from "./form-ui";

const MAX_ITEMS = 12;
const id = () => Math.random().toString(36).slice(2, 10);

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: NavItem[];
  categories: { slug: string; label: string }[];
  pages: { slug: string; title: string }[];
};

export function NavigationEditor({ action, initial, categories, pages }: Props) {
  const [state, formAction] = useFormState(action, {});
  const [items, setItems] = useState<NavItem[]>(initial);

  const update = (i: number, patch: Partial<NavItem>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => setItems((arr) => [...arr, { id: id(), label: "", type: "url", value: "" }]);

  return (
    <form action={formAction} className="card max-w-3xl space-y-4 p-6" data-testid="navigation-editor">
      <FormMessage error={state.error} success={state.success} />
      <input type="hidden" name="navigationJson" value={JSON.stringify(items)} />
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3" data-testid={`nav-item-row-${i}`}>
            <input
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Rótulo"
              className="field w-36"
              data-testid={`nav-item-label-${i}`}
            />
            <select
              value={item.type}
              onChange={(e) => update(i, { type: e.target.value as NavItem["type"], value: "" })}
              className="field w-32"
              data-testid={`nav-item-type-${i}`}
            >
              <option value="category">Categoria</option>
              <option value="page">Página</option>
              <option value="url">URL</option>
            </select>
            {item.type === "category" && (
              <select value={item.value} onChange={(e) => update(i, { value: e.target.value })} className="field flex-1" data-testid={`nav-item-value-${i}`}>
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            )}
            {item.type === "page" && (
              <select value={item.value} onChange={(e) => update(i, { value: e.target.value })} className="field flex-1" data-testid={`nav-item-value-${i}`}>
                <option value="">Selecione…</option>
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.title}</option>
                ))}
              </select>
            )}
            {item.type === "url" && (
              <input
                value={item.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="https:// ou /caminho"
                className="field flex-1"
                data-testid={`nav-item-value-${i}`}
              />
            )}
            <div className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-outline px-2 disabled:opacity-30" data-testid={`nav-item-up-${i}`}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="btn-outline px-2 disabled:opacity-30" data-testid={`nav-item-down-${i}`}>↓</button>
              <button type="button" onClick={() => remove(i)} className="btn-ghost" data-testid={`nav-item-remove-${i}`}>Remover</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink/50">Nenhum item no menu ainda.</p>}
      </div>
      {items.length < MAX_ITEMS && (
        <button type="button" onClick={add} className="btn-outline" data-testid="nav-item-add-button">+ Adicionar item</button>
      )}
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="navigation-submit-button">Salvar menu</SubmitButton>
      </div>
    </form>
  );
}
