"use client";

import { useState, useTransition } from "react";
import type { z } from "zod";
import { formatBRL } from "@repo/db/utils";
import { useHydrated, useStoreCart, type CartItem } from "@/lib/cart-store";
import { addressSchema, customerDetailsSchema, identificationSchema } from "@/lib/validation";
import { createCheckoutSession } from "@/actions/checkout";

type Step = 1 | 2 | 3;

const emptyIdentification = { email: "", name: "", phone: "", document: "" };
const emptyAddress = { zip: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages?.[0]) out[key] = messages[0];
  }
  return out;
}

async function lookupCep(cep: string) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}

export function CheckoutForm({ storeSlug }: { storeSlug: string }) {
  const hydrated = useHydrated();
  const items = useStoreCart(storeSlug);
  const [step, setStep] = useState<Step>(1);
  const [identification, setIdentification] = useState(emptyIdentification);
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "not-found">("idle");
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!hydrated) return <div className="mx-auto max-w-lg px-5 py-10"><div className="h-64 animate-pulse rounded-3xl bg-ink/5" /></div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center" data-testid="checkout-empty">
        <p className="text-ink/50">Seu carrinho está vazio.</p>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.priceInCents * i.quantity, 0);

  function goToAddress() {
    const result = identificationSchema.safeParse(identification);
    if (!result.success) {
      setErrors(firstErrors(result.error));
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function handleCepBlur() {
    const digits = address.zip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepStatus("loading");
    const found = await lookupCep(digits);
    if (!found) {
      setCepStatus("not-found");
      return;
    }
    setCepStatus("idle");
    setAddress((prev) => ({ ...prev, ...found }));
  }

  function goToReview() {
    const result = addressSchema.safeParse(address);
    if (!result.success) {
      setErrors(firstErrors(result.error));
      return;
    }
    setErrors({});
    setStep(3);
  }

  function submit() {
    // Revalida tudo junto antes de mandar pro servidor (os passos 1 e 2 já validaram em separado)
    const details = customerDetailsSchema.safeParse({ ...identification, ...address });
    if (!details.success) {
      setSubmitError("Alguns dados ficaram inválidos. Volte e confira as etapas anteriores.");
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      const result = await createCheckoutSession({
        storeSlug,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ...details.data,
      });
      if ("error" in result) setSubmitError(result.error);
      else window.location.href = result.url;
    });
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-8 sm:px-8">
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold text-ink/40" data-testid="checkout-steps">
        {(["Identificação", "Entrega", "Resumo"] as const).map((label, i) => (
          <li key={label} className={`flex items-center gap-2 ${step === i + 1 ? "text-ink" : ""}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full ${step === i + 1 ? "bg-brand text-brand-contrast" : "bg-ink/10"}`}>
              {i + 1}
            </span>
            {label}
            {i < 2 && <span className="mx-1 text-ink/20">›</span>}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <IdentificationStep
          values={identification}
          errors={errors}
          onChange={setIdentification}
          onNext={goToAddress}
        />
      )}

      {step === 2 && (
        <AddressStep
          values={address}
          errors={errors}
          cepStatus={cepStatus}
          onChange={setAddress}
          onCepBlur={handleCepBlur}
          onBack={() => setStep(1)}
          onNext={goToReview}
        />
      )}

      {step === 3 && (
        <ReviewStep
          identification={identification}
          address={address}
          items={items}
          subtotal={subtotal}
          pending={pending}
          error={submitError}
          onBack={() => setStep(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

type IdentificationValues = typeof emptyIdentification;
type AddressValues = typeof emptyAddress;

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-700" data-testid={`checkout-${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function IdentificationStep({
  values,
  errors,
  onChange,
  onNext,
}: {
  values: IdentificationValues;
  errors: Record<string, string>;
  onChange: (v: IdentificationValues) => void;
  onNext: () => void;
}) {
  const set = (k: keyof IdentificationValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [k]: e.target.value });

  return (
    <div className="space-y-4" data-testid="checkout-step-identification">
      <Field label="E-mail" name="email" error={errors.email}>
        <input id="email" className="field" value={values.email} onChange={set("email")} data-testid="checkout-email-input" />
      </Field>
      <Field label="Nome completo" name="name" error={errors.name}>
        <input id="name" className="field" value={values.name} onChange={set("name")} data-testid="checkout-name-input" />
      </Field>
      <Field label="Telefone" name="phone" error={errors.phone}>
        <input
          id="phone"
          className="field"
          placeholder="(11) 91234-5678"
          value={values.phone}
          onChange={set("phone")}
          data-testid="checkout-phone-input"
        />
      </Field>
      <Field label="CPF ou CNPJ" name="document" error={errors.document}>
        <input id="document" className="field" value={values.document} onChange={set("document")} data-testid="checkout-document-input" />
      </Field>
      <button type="button" onClick={onNext} className="btn-brand w-full py-3" data-testid="checkout-identification-next-button">
        Continuar
      </button>
    </div>
  );
}

function AddressStep({
  values,
  errors,
  cepStatus,
  onChange,
  onCepBlur,
  onBack,
  onNext,
}: {
  values: AddressValues;
  errors: Record<string, string>;
  cepStatus: "idle" | "loading" | "not-found";
  onChange: (v: AddressValues) => void;
  onCepBlur: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const set = (k: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [k]: e.target.value });

  return (
    <div className="space-y-4" data-testid="checkout-step-address">
      <Field label="CEP" name="zip" error={errors.zip}>
        <input
          id="zip"
          className="field"
          placeholder="00000-000"
          value={values.zip}
          onChange={set("zip")}
          onBlur={onCepBlur}
          data-testid="checkout-zip-input"
        />
        {cepStatus === "loading" && <p className="mt-1 text-xs text-ink/50">Buscando endereço…</p>}
        {cepStatus === "not-found" && (
          <p className="mt-1 text-xs text-ink/50" data-testid="checkout-zip-not-found">
            CEP não encontrado — preencha o endereço manualmente.
          </p>
        )}
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Rua" name="street" error={errors.street}>
            <input id="street" className="field" value={values.street} onChange={set("street")} data-testid="checkout-street-input" />
          </Field>
        </div>
        <Field label="Número" name="number" error={errors.number}>
          <input id="number" className="field" value={values.number} onChange={set("number")} data-testid="checkout-number-input" />
        </Field>
      </div>
      <Field label="Complemento (opcional)" name="complement" error={errors.complement}>
        <input id="complement" className="field" value={values.complement} onChange={set("complement")} data-testid="checkout-complement-input" />
      </Field>
      <Field label="Bairro" name="district" error={errors.district}>
        <input id="district" className="field" value={values.district} onChange={set("district")} data-testid="checkout-district-input" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Cidade" name="city" error={errors.city}>
            <input id="city" className="field" value={values.city} onChange={set("city")} data-testid="checkout-city-input" />
          </Field>
        </div>
        <Field label="UF" name="state" error={errors.state}>
          <input id="state" className="field" maxLength={2} value={values.state} onChange={set("state")} data-testid="checkout-state-input" />
        </Field>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-ghost flex-1 py-3" data-testid="checkout-address-back-button">
          Voltar
        </button>
        <button type="button" onClick={onNext} className="btn-brand flex-1 py-3" data-testid="checkout-address-next-button">
          Continuar
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  identification,
  address,
  items,
  subtotal,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  identification: IdentificationValues;
  address: AddressValues;
  items: CartItem[];
  subtotal: number;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6" data-testid="checkout-step-review">
      <section>
        <p className="label">Identificação</p>
        <p className="text-sm" data-testid="checkout-review-identification">
          {identification.name} · {identification.email} · {identification.phone}
        </p>
      </section>
      <section>
        <p className="label">Entrega</p>
        <p className="text-sm" data-testid="checkout-review-address">
          {address.street}, {address.number}
          {address.complement ? ` - ${address.complement}` : ""} · {address.district} · {address.city}/{address.state} · {address.zip}
        </p>
      </section>
      <section>
        <p className="label">Itens</p>
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white text-sm">
          {items.map((it) => (
            <li key={it.productId} className="flex justify-between p-3">
              <span>{it.quantity}× {it.name}</span>
              <span>{formatBRL(it.priceInCents * it.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between p-3 font-semibold">
            <span>Total</span>
            <span data-testid="checkout-review-total">{formatBRL(subtotal)}</span>
          </li>
        </ul>
      </section>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-ghost flex-1 py-3" data-testid="checkout-review-back-button">
          Voltar
        </button>
        <button type="button" onClick={onSubmit} disabled={pending} className="btn-brand flex-1 py-3" data-testid="checkout-submit-button">
          {pending ? "Redirecionando…" : "Ir para o pagamento"}
        </button>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" data-testid="checkout-submit-error">
          {error}
        </p>
      )}
    </div>
  );
}
