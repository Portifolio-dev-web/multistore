"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { slugify } from "@repo/db/utils";
import { register } from "@/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

export function RegisterForm() {
  const [state, action] = useFormState(register, {});
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const e = state.fieldErrors;

  return (
    <form action={action} className="space-y-4" data-testid="register-form">
      <FormMessage error={state.error} />
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" name="name" required className="field" data-testid="register-name-input" />
        <FieldError errors={e?.name} />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="field" data-testid="register-email-input" />
        <FieldError errors={e?.email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" minLength={8} required className="field" data-testid="register-password-input" />
        <FieldError errors={e?.password} />
      </div>
      <div>
        <label className="label" htmlFor="storeName">Nome da loja</label>
        <input
          id="storeName"
          name="storeName"
          required
          className="field"
          onChange={(ev) => !slugEdited && setSlug(slugify(ev.target.value))}
          data-testid="register-store-name-input"
        />
        <FieldError errors={e?.storeName} />
      </div>
      <div>
        <label className="label" htmlFor="storeSlug">Endereço da loja</label>
        <div className="flex items-center rounded-lg border border-line bg-white focus-within:border-ink">
          <span className="pl-3 font-mono text-xs text-ink/40">/</span>
          <input
            id="storeSlug"
            name="storeSlug"
            required
            value={slug}
            onChange={(ev) => {
              setSlugEdited(true);
              setSlug(ev.target.value);
            }}
            className="w-full bg-transparent px-1.5 py-2.5 font-mono text-sm outline-none"
            data-testid="register-store-slug-input"
          />
        </div>
        <FieldError errors={e?.storeSlug} />
      </div>
      <SubmitButton className="btn w-full" pendingLabel="Criando…" testId="register-submit-button">Criar minha loja</SubmitButton>
      <p className="text-center text-sm text-ink/60">
        Já tem conta? <Link href="/login" className="font-semibold text-ink underline underline-offset-4" data-testid="go-to-login-link">Entrar</Link>
      </p>
    </form>
  );
}
