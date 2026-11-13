"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { Store } from "@repo/db";
import { contrastText } from "@repo/db/utils";
import { updateStoreSettings } from "@/actions/settings";
import { FieldError, FormMessage, SubmitButton } from "./form-ui";

type Props = {
  store: Pick<
    Store,
    | "name"
    | "slug"
    | "description"
    | "logoUrl"
    | "primaryColor"
    | "accentColor"
    | "customDomain"
    | "whatsapp"
    | "theme"
    | "font"
    | "faviconUrl"
    | "announcementBar"
    | "gaId"
    | "gtmId"
    | "metaPixelId"
    | "tiktokPixelId"
  >;
};

export function SettingsForm({ store }: Props) {
  const [state, action] = useFormState(updateStoreSettings, {});
  const [name, setName] = useState(store.name);
  const [primary, setPrimary] = useState(store.primaryColor);
  const [accent, setAccent] = useState(store.accentColor);
  const [theme, setTheme] = useState(store.theme);
  const [font, setFont] = useState(store.font);
  const e = state.fieldErrors;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <form action={action} className="card space-y-5 p-6" data-testid="settings-form">
        <FormMessage error={state.error} success={state.success} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nome da loja</label>
            <input id="name" name="name" value={name} onChange={(ev) => setName(ev.target.value)} required className="field" data-testid="settings-name-input" />
            <FieldError errors={e?.name} />
          </div>
          <div>
            <label className="label" htmlFor="slug">Endereço (slug)</label>
            <input id="slug" name="slug" defaultValue={store.slug} required className="field font-mono" data-testid="settings-slug-input" />
            <FieldError errors={e?.slug} testId="settings-slug-error" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={3} defaultValue={store.description ?? ""} className="field" data-testid="settings-description-input" />
          <FieldError errors={e?.description} />
        </div>
        <div>
          <label className="label" htmlFor="logoUrl">URL do logo</label>
          <input id="logoUrl" name="logoUrl" type="url" defaultValue={store.logoUrl ?? ""} placeholder="https://…" className="field font-mono text-xs" data-testid="settings-logo-input" />
          <FieldError errors={e?.logoUrl} />
        </div>
        <div>
          <label className="label" htmlFor="customDomain">Domínio próprio (opcional)</label>
          <input id="customDomain" name="customDomain" defaultValue={store.customDomain ?? ""} placeholder="www.minhaloja.com.br" className="field font-mono text-sm" data-testid="settings-custom-domain-input" />
          <FieldError errors={e?.customDomain} testId="settings-custom-domain-error" />
        </div>
        <div>
          <label className="label" htmlFor="whatsapp">WhatsApp (opcional)</label>
          <input
            id="whatsapp"
            name="whatsapp"
            defaultValue={store.whatsapp ?? ""}
            placeholder="5511999999999 (DDI+DDD+número)"
            className="field font-mono text-sm"
            data-testid="settings-whatsapp-input"
          />
          <FieldError errors={e?.whatsapp} testId="settings-whatsapp-error" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <ColorField name="primaryColor" label="Cor principal" value={primary} onChange={setPrimary} errors={e?.primaryColor} />
          <ColorField name="accentColor" label="Cor de destaque" value={accent} onChange={setAccent} errors={e?.accentColor} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="theme">Tema</label>
            <select id="theme" name="theme" value={theme} onChange={(ev) => setTheme(ev.target.value as typeof theme)} className="field" data-testid="settings-theme-select">
              <option value="CLASSICO">Clássico</option>
              <option value="MODERNO">Moderno</option>
              <option value="MINIMALISTA">Minimalista</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="font">Fonte</label>
            <select id="font" name="font" value={font} onChange={(ev) => setFont(ev.target.value as typeof font)} className="field" data-testid="settings-font-select">
              <option value="SANS">Sem serifa</option>
              <option value="SERIF">Serifada</option>
              <option value="MONO">Monoespaçada</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="faviconUrl">Favicon (URL, opcional)</label>
          <input id="faviconUrl" name="faviconUrl" defaultValue={store.faviconUrl ?? ""} placeholder="https://…/favicon.png" className="field font-mono text-xs" data-testid="settings-favicon-input" />
          <FieldError errors={e?.faviconUrl} />
        </div>
        <div>
          <label className="label" htmlFor="announcementBar">Barra de aviso no topo (opcional)</label>
          <input id="announcementBar" name="announcementBar" defaultValue={store.announcementBar ?? ""} placeholder="Frete grátis acima de R$ 199" className="field" data-testid="settings-announcement-input" />
          <FieldError errors={e?.announcementBar} />
        </div>
        <div className="border-t border-line pt-5">
          <p className="label">Pixels e analytics</p>
          <p className="mt-1 text-xs text-ink/50">Só carregam na vitrine depois que o visitante aceita o banner de cookies.</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="gaId">Google Analytics (GA4)</label>
              <input id="gaId" name="gaId" defaultValue={store.gaId ?? ""} placeholder="G-XXXXXXX" className="field font-mono text-sm" data-testid="settings-ga-id-input" />
              <FieldError errors={e?.gaId} />
            </div>
            <div>
              <label className="label" htmlFor="gtmId">Google Tag Manager</label>
              <input id="gtmId" name="gtmId" defaultValue={store.gtmId ?? ""} placeholder="GTM-XXXXXXX" className="field font-mono text-sm" data-testid="settings-gtm-id-input" />
              <FieldError errors={e?.gtmId} />
            </div>
            <div>
              <label className="label" htmlFor="metaPixelId">Meta Pixel</label>
              <input id="metaPixelId" name="metaPixelId" defaultValue={store.metaPixelId ?? ""} placeholder="000000000000000" className="field font-mono text-sm" data-testid="settings-meta-pixel-input" />
              <FieldError errors={e?.metaPixelId} />
            </div>
            <div>
              <label className="label" htmlFor="tiktokPixelId">TikTok Pixel</label>
              <input id="tiktokPixelId" name="tiktokPixelId" defaultValue={store.tiktokPixelId ?? ""} placeholder="XXXXXXXXXXXXXXXXXXXX" className="field font-mono text-sm" data-testid="settings-tiktok-pixel-input" />
              <FieldError errors={e?.tiktokPixelId} />
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-line pt-5">
          <SubmitButton testId="settings-submit-button">Salvar configurações</SubmitButton>
        </div>
      </form>
      <Preview name={name} primary={primary} accent={accent} theme={theme} font={font} />
    </div>
  );
}

type ColorProps = { name: string; label: string; value: string; onChange: (v: string) => void; errors?: string[] };

function ColorField({ name, label, value, onChange, errors }: ColorProps) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-1.5">
        <input type="color" value={value} onChange={(ev) => onChange(ev.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" data-testid={`settings-${name}-picker`} />
        <input id={name} name={name} value={value} onChange={(ev) => onChange(ev.target.value)} className="w-full bg-transparent font-mono text-sm outline-none" data-testid={`settings-${name}-input`} />
      </div>
      <FieldError errors={errors} />
    </div>
  );
}

const THEME_RADIUS: Record<string, { card: string; btn: string }> = {
  CLASSICO: { card: "1rem", btn: "9999px" },
  MODERNO: { card: "0.5rem", btn: "0.5rem" },
  MINIMALISTA: { card: "0", btn: "0" },
};

const FONT_FAMILY: Record<string, string> = {
  SANS: "ui-sans-serif, system-ui, sans-serif",
  SERIF: "Georgia, 'Times New Roman', serif",
  MONO: "'Courier New', monospace",
};

function Preview({ name, primary, accent, theme, font }: { name: string; primary: string; accent: string; theme: string; font: string }) {
  const text = contrastText(primary);
  const radius = THEME_RADIUS[theme] ?? THEME_RADIUS.CLASSICO;
  const fontFamily = FONT_FAMILY[font] ?? FONT_FAMILY.SANS;
  return (
    <div className="card overflow-hidden xl:sticky xl:top-8 xl:self-start" data-testid="settings-preview">
      <p className="label border-b border-line px-5 py-3">Pré-visualização</p>
      <div className="bg-[#f7f5f0] p-5" style={{ fontFamily }}>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center text-xs font-bold" style={{ background: primary, color: text, borderRadius: radius.btn }}>{name.slice(0, 1)}</span>
          <span className="font-semibold">{name || "Sua loja"}</span>
        </div>
        <span className="mt-6 block h-1 w-10" style={{ background: accent, borderRadius: radius.btn }} />
        <p className="mt-3 text-2xl font-bold leading-tight">{name || "Sua loja"}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="aspect-[4/5]" style={{ background: primary, opacity: 0.15 + i * 0.1, borderRadius: radius.card }} />
              <div className="mt-2 h-2 w-3/4 rounded bg-black/10" />
            </div>
          ))}
        </div>
        <button type="button" className="mt-5 w-full py-2.5 text-sm font-semibold" style={{ background: primary, color: text, borderRadius: radius.btn }}>
          Adicionar ao carrinho
        </button>
      </div>
    </div>
  );
}
