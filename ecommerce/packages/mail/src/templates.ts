import { contrastText, formatAddress, formatBRL } from "@repo/db/utils";

type StoreTheme = { name: string; primaryColor: string; accentColor: string; logoUrl: string | null };
type Item = { productName: string; quantity: number; unitPriceInCents: number };

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function button(store: StoreTheme, href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${store.primaryColor};color:${contrastText(store.primaryColor)};text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:999px">${esc(label)}</a>`;
}

function shell(store: StoreTheme, preheader: string, body: string): string {
  const fg = contrastText(store.primaryColor);
  const logo = store.logoUrl
    ? `<img src="${esc(store.logoUrl)}" alt="" width="36" height="36" style="border-radius:50%;vertical-align:middle;margin-right:10px">`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f5f0;font-family:Helvetica,Arial,sans-serif;color:#16140f">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:${store.primaryColor};color:${fg};padding:24px 28px;font-size:18px;font-weight:700">${logo}${esc(store.name)}</td></tr>
<tr><td style="height:4px;background:${store.accentColor}"></td></tr>
<tr><td style="padding:32px 28px">${body}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #eee;font-size:12px;color:#8a857b">Você recebeu este e-mail porque fez um pedido em ${esc(store.name)}.</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(items: Item[], totalInCents: number): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ede6;font-size:14px">${i.quantity}× ${esc(i.productName)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #f0ede6;font-size:14px">${formatBRL(i.unitPriceInCents * i.quantity)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">${rows}
<tr><td style="padding:14px 0 0;font-weight:700">Total</td><td align="right" style="padding:14px 0 0;font-weight:700;font-size:18px">${formatBRL(totalInCents)}</td></tr></table>`;
}

type OrderMail = {
  store: StoreTheme;
  code: string;
  customerName: string | null;
  items: Item[];
  totalInCents: number;
  shippingAddress: unknown;
  orderUrl: string;
};

export function orderConfirmationEmail(o: OrderMail) {
  const hello = o.customerName ? `Olá, ${esc(o.customerName.split(" ")[0])}!` : "Olá!";
  const address = formatAddress(o.shippingAddress);
  const addressHtml = address.length
    ? `<p style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#8a857b;margin:24px 0 6px">Entrega em</p><p style="margin:0;font-size:14px;line-height:1.6">${address.map(esc).join("<br>")}</p>`
    : "";
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Pagamento confirmado ✓</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">${hello} Recebemos seu pagamento do pedido <strong>#${esc(o.code)}</strong>. Avisaremos assim que ele for enviado.</p>
${itemsTable(o.items, o.totalInCents)}${addressHtml}
<p style="margin:32px 0 0">${button(o.store, o.orderUrl, "Acompanhar pedido")}</p>`;
  const text = `Pagamento confirmado — pedido #${o.code}\n\n${o.items.map((i) => `${i.quantity}x ${i.productName} — ${formatBRL(i.unitPriceInCents * i.quantity)}`).join("\n")}\nTotal: ${formatBRL(o.totalInCents)}\n\nAcompanhe: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} confirmado — ${o.store.name}`, html: shell(o.store, `Pagamento do pedido #${o.code} confirmado`, body), text };
}

type ShippingMail = { store: StoreTheme; code: string; carrier: string | null; trackingCode: string; trackingUrl: string | null; orderUrl: string };

export function shippingUpdateEmail(o: ShippingMail) {
  const carrier = o.carrier ? ` via <strong>${esc(o.carrier)}</strong>` : "";
  const track = o.trackingUrl ? `<p style="margin:16px 0 0;font-size:14px"><a href="${esc(o.trackingUrl)}" style="color:#16140f">Rastrear na transportadora →</a></p>` : "";
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Seu pedido está a caminho</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">O pedido <strong>#${esc(o.code)}</strong> foi enviado${carrier}.</p>
<div style="margin:24px 0;padding:18px;border-radius:14px;background:#f7f5f0">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#8a857b">Código de rastreio</p>
<p style="margin:0;font-family:Menlo,monospace;font-size:20px;font-weight:700;letter-spacing:.06em">${esc(o.trackingCode)}</p></div>
<p style="margin:0">${button(o.store, o.orderUrl, "Ver status do pedido")}</p>${track}`;
  const text = `Pedido #${o.code} enviado${o.carrier ? ` via ${o.carrier}` : ""}.\nCódigo de rastreio: ${o.trackingCode}\n${o.trackingUrl ?? ""}\n\nStatus: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} enviado — ${o.store.name}`, html: shell(o.store, `Código de rastreio: ${o.trackingCode}`, body), text };
}
