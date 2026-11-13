"use client";

import { useFormState } from "react-dom";
import type { HomeSection } from "@repo/db/content";
import { subscribeNewsletter, type NewsletterState } from "@/actions/newsletter";

type Props = { section: Extract<HomeSection, { type: "newsletter" }>; storeSlug: string };

export function Newsletter({ section, storeSlug }: Props) {
  const action = subscribeNewsletter.bind(null, storeSlug);
  const [state, formAction] = useFormState<NewsletterState, FormData>(action, {});

  return (
    <section className="rounded-3xl bg-brand px-8 py-10 text-center text-brand-contrast" data-testid="section-newsletter">
      <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{section.title || "Fique por dentro"}</h2>
      {section.subtitle && <p className="mt-2 opacity-80">{section.subtitle}</p>}
      {state.success ? (
        <p className="mt-6 font-medium" data-testid="newsletter-success">Inscrito! Obrigado.</p>
      ) : (
        <form action={formAction} className="mx-auto mt-6 flex max-w-sm gap-2">
          <input name="email" type="email" required placeholder="seu@email.com" className="field flex-1" data-testid="newsletter-email-input" />
          <button type="submit" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink" data-testid="newsletter-submit-button">
            Inscrever
          </button>
        </form>
      )}
      {state.error && <p className="mt-2 text-sm" data-testid="newsletter-error">{state.error}</p>}
    </section>
  );
}
