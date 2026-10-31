"use client";

import { useFormState } from "react-dom";
import { centsToInput } from "@repo/db/utils";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";
import { ImageUploader } from "./image-uploader";

type ProductValues = {
  name: string;
  description: string;
  category: string | null;
  priceInCents: number;
  stock: number;
  images: string[];
  active: boolean;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  product?: ProductValues;
  submitLabel: string;
};

export function ProductForm({ action, product, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6" data-testid="product-form">
      <FormMessage error={state.error} success={state.success} />
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" defaultValue={product?.name} required className="field" data-testid="product-name-input" />
        <FieldError errors={e?.name} testId="product-name-error" />
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <textarea id="description" name="description" rows={5} defaultValue={product?.description} className="field" data-testid="product-description-input" />
        <FieldError errors={e?.description} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="priceInCents">Preço (R$)</label>
          <input id="priceInCents" name="priceInCents" inputMode="decimal" placeholder="129,90" defaultValue={product ? centsToInput(product.priceInCents) : ""} required className="field font-mono" data-testid="product-price-input" />
          <FieldError errors={e?.priceInCents} testId="product-price-error" />
        </div>
        <div>
          <label className="label" htmlFor="stock">Estoque</label>
          <input id="stock" name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} required className="field font-mono" data-testid="product-stock-input" />
          <FieldError errors={e?.stock} />
        </div>
        <div>
          <label className="label" htmlFor="category">Categoria</label>
          <input id="category" name="category" defaultValue={product?.category ?? ""} className="field" data-testid="product-category-input" />
          <FieldError errors={e?.category} />
        </div>
      </div>
      <div>
        <span className="label">Imagens</span>
        <ImageUploader initial={product?.images} />
        <FieldError errors={e?.images} testId="product-images-error" />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-ink" data-testid="product-active-checkbox" />
        Visível na vitrine
      </label>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton testId="product-submit-button">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
