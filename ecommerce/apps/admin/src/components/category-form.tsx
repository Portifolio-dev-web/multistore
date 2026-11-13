"use client";

import { useFormState } from "react-dom";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export type CategoryOption = { id: string; label: string };

type CategoryValues = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  position: number;
  parentId: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  category?: CategoryValues;
  options: CategoryOption[];
  submitLabel: string;
};

export function CategoryForm({ action, category, options, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const parentOptions = options.filter((o) => o.id !== category?.id);

  return (
    <form action={formAction} className="card max-w-2xl space-y-5 p-6" data-testid="category-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" defaultValue={category?.name} required className="field" data-testid="category-name-input" />
        <FieldError errors={e?.name} testId="category-name-error" />
      </div>
      <div>
        <label className="label" htmlFor="slug">Endereço (slug)</label>
        <input
          id="slug"
          name="slug"
          defaultValue={category?.slug}
          placeholder="gerado a partir do nome se deixar em branco"
          className="field font-mono text-sm"
          data-testid="category-slug-input"
        />
        <FieldError errors={e?.slug} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="parentId">Categoria pai</label>
          <select id="parentId" name="parentId" defaultValue={category?.parentId ?? ""} className="field" data-testid="category-parent-select">
            <option value="">Nenhuma (categoria raiz)</option>
            {parentOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <FieldError errors={e?.parentId} testId="category-parent-error" />
        </div>
        <div>
          <label className="label" htmlFor="position">Posição</label>
          <input id="position" name="position" type="number" min={0} defaultValue={category?.position ?? 0} className="field font-mono" data-testid="category-position-input" />
          <FieldError errors={e?.position} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <textarea id="description" name="description" rows={3} defaultValue={category?.description} className="field" data-testid="category-description-input" />
        <FieldError errors={e?.description} />
      </div>
      <div>
        <label className="label" htmlFor="imageUrl">Imagem (URL)</label>
        <input id="imageUrl" name="imageUrl" defaultValue={category?.imageUrl ?? ""} placeholder="https://…" className="field" data-testid="category-image-input" />
        <FieldError errors={e?.imageUrl} />
      </div>
      <div className="border-t border-line pt-5">
        <p className="label">SEO</p>
        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="seoTitle">Título para buscadores (opcional)</label>
            <input id="seoTitle" name="seoTitle" defaultValue={category?.seoTitle ?? ""} placeholder="usa o nome da categoria se deixar em branco" className="field" data-testid="category-seo-title-input" />
            <FieldError errors={e?.seoTitle} />
          </div>
          <div>
            <label className="label" htmlFor="seoDescription">Descrição para buscadores (opcional)</label>
            <textarea id="seoDescription" name="seoDescription" rows={2} defaultValue={category?.seoDescription ?? ""} className="field" data-testid="category-seo-description-input" />
            <FieldError errors={e?.seoDescription} />
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="category-submit-button">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
