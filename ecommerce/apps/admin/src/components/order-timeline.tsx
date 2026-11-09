"use client";

import { useFormState } from "react-dom";
import type { OrderEvent } from "@repo/db";
import type { FormState } from "@/lib/form";
import { FormMessage, SubmitButton } from "./form-ui";

const ACTOR_LABEL = { SYSTEM: "Sistema", MERCHANT: "Você", CUSTOMER: "Cliente" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

type Props = {
  events: OrderEvent[];
  addNoteAction: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function OrderTimeline({ events, addNoteAction }: Props) {
  const [state, formAction] = useFormState(addNoteAction, {});

  return (
    <section className="card space-y-4 p-5" data-testid="order-timeline">
      <h2 className="font-semibold">Linha do tempo</h2>
      <ul className="space-y-3">
        {events.map((e) => (
          <li key={e.id} className="text-sm" data-testid={`order-event-${e.id}`}>
            <p className={e.type === "NOTE" ? "italic text-ink/80" : ""}>{e.message}</p>
            <p className="font-mono text-[11px] text-ink/40">
              {dateFmt.format(e.createdAt)} · {ACTOR_LABEL[e.actor]}
            </p>
          </li>
        ))}
        {events.length === 0 && <li className="text-sm text-ink/50">Nenhum evento ainda.</li>}
      </ul>
      <form action={formAction} className="space-y-2 border-t border-line pt-4">
        <FormMessage error={state.error} success={state.success} />
        <label className="label" htmlFor="message">Nota interna</label>
        <textarea id="message" name="message" rows={2} className="field" placeholder="Visível só pra você" data-testid="order-note-input" />
        <div className="flex justify-end">
          <SubmitButton className="btn-outline" testId="order-note-submit-button">Adicionar nota</SubmitButton>
        </div>
      </form>
    </section>
  );
}
