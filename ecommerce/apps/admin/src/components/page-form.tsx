"use client";

import { useFormState } from "react-dom";
import type { Page } from "@repo/db";
import type { FormState } from "@/lib/form";
import { AiPageContentButton } from "./ai-page-content-button";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  page?: Page;
  aiEnabled: boolean;
  submitLabel: string;
};

export function PageForm({ action, page, aiEnabled, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6" data-testid="page-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="title">Título</label>
        <input id="title" name="title" defaultValue={page?.title} required className="field" data-testid="page-title-input" />
        <FieldError errors={e?.title} />
      </div>
      <div>
        <label className="label" htmlFor="slug">Endereço (slug)</label>
        <input
          id="slug"
          name="slug"
          defaultValue={page?.slug}
          placeholder="gerado a partir do título se deixar em branco"
          className="field font-mono text-sm"
          data-testid="page-slug-input"
        />
        <FieldError errors={e?.slug} />
      </div>
      <div>
        <label className="label" htmlFor="content">Conteúdo (Markdown: # título, **negrito**, - lista, [link](url))</label>
        <textarea id="content" name="content" rows={14} defaultValue={page?.content} className="field font-mono text-sm" data-testid="page-content-input" />
        <FieldError errors={e?.content} />
        <AiPageContentButton enabled={aiEnabled} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={page?.published ?? true} data-testid="page-published-checkbox" />
        Publicada
      </label>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="page-submit-button">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
