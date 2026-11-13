"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createReview, type ReviewFormState } from "@/actions/reviews";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brand py-2.5" data-testid="review-submit-button">
      {pending ? "Enviando…" : "Enviar avaliação"}
    </button>
  );
}

type Props = { storeSlug: string; productId: string; verified?: { orderId: string; token: string } };

export function ReviewForm({ storeSlug, productId, verified }: Props) {
  const action = createReview.bind(null, storeSlug, productId);
  const [state, formAction] = useFormState<ReviewFormState, FormData>(action, {});
  const [rating, setRating] = useState(5);

  if (state.success) {
    return (
      <p className="rounded-2xl bg-ink/5 p-4 text-sm" data-testid="review-submitted">
        Avaliação enviada! Ela aparece na página depois de aprovada.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5" data-testid="review-form">
      {verified && (
        <>
          <input type="hidden" name="orderId" value={verified.orderId} />
          <input type="hidden" name="token" value={verified.token} />
          <p className="text-xs font-semibold text-emerald-700" data-testid="review-verified-badge">✓ Compra verificada</p>
        </>
      )}
      <div>
        <p className="label">Nota</p>
        <div className="mt-1 flex gap-1" data-testid="review-rating-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-500" : "text-ink/20"}`}
              aria-label={`${n} estrela(s)`}
              data-testid={`review-rating-star-${n}`}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>
      <input name="authorName" placeholder="Seu nome" required className="field" data-testid="review-author-input" />
      <textarea name="text" placeholder="O que você achou do produto?" required rows={3} className="field" data-testid="review-text-input" />
      {state.error && <p className="text-sm text-red-700" data-testid="review-form-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
