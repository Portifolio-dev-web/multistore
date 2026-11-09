"use client";

import { useFormState } from "react-dom";
import { centsToInput } from "@repo/db/utils";
import type { FormState } from "@/lib/form";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";
import { ImageUploader } from "./image-uploader";

type ProductValues = {
  name: string;
  slug: string;
  description: string;
  categoryIds: string[];
  priceInCents: number;
  compareAtPriceInCents: number | null;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  stock: number;
  images: string[];
  active: boolean;
};

function toDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  product?: ProductValues;
  categories: { id: string; label: string }[];
  submitLabel: string;
};

export function ProductForm({ action, product, categories, submitLabel }: Props) {
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
        <label className="label" htmlFor="slug">Endereço (slug)</label>
        <input
          id="slug"
          name="slug"
          defaultValue={product?.slug}
          placeholder="gerado a partir do nome se deixar em branco"
          className="field font-mono text-sm"
          data-testid="product-slug-input"
        />
        <FieldError errors={e?.slug} />
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <textarea id="description" name="description" rows={5} defaultValue={product?.description} className="field" data-testid="product-description-input" />
        <FieldError errors={e?.description} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
      <div>
        <span className="label">Categorias</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-line p-3">
          {categories.length === 0 && <p className="text-sm text-ink/50">Nenhuma categoria ainda — crie em &quot;Categorias&quot;.</p>}
          {categories.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                defaultChecked={product?.categoryIds.includes(c.id)}
                className="h-4 w-4 accent-ink"
                data-testid={`product-category-checkbox-${c.id}`}
              />
              {c.label}
            </label>
          ))}
        </div>
        <FieldError errors={e?.categoryIds} testId="product-category-error" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="compareAtPriceInCents">Preço &quot;de&quot; (promocional)</label>
          <input
            id="compareAtPriceInCents"
            name="compareAtPriceInCents"
            inputMode="decimal"
            placeholder="opcional"
            defaultValue={product?.compareAtPriceInCents ? centsToInput(product.compareAtPriceInCents) : ""}
            className="field font-mono"
            data-testid="product-compare-price-input"
          />
          <FieldError errors={e?.compareAtPriceInCents} testId="product-compare-price-error" />
        </div>
        <div>
          <label className="label" htmlFor="promoStartsAt">Início da promoção</label>
          <input
            id="promoStartsAt"
            name="promoStartsAt"
            type="date"
            defaultValue={toDateInput(product?.promoStartsAt)}
            className="field"
            data-testid="product-promo-starts-input"
          />
          <FieldError errors={e?.promoStartsAt} />
        </div>
        <div>
          <label className="label" htmlFor="promoEndsAt">Fim da promoção</label>
          <input
            id="promoEndsAt"
            name="promoEndsAt"
            type="date"
            defaultValue={toDateInput(product?.promoEndsAt)}
            className="field"
            data-testid="product-promo-ends-input"
          />
          <FieldError errors={e?.promoEndsAt} />
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
