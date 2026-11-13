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

// F3.1: login sem senha — o link expira em 15 minutos e só funciona uma vez
export function customerLoginLinkEmail(o: { store: StoreTheme; loginUrl: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Entrar na sua conta</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">Clique no botão abaixo para entrar em <strong>${esc(o.store.name)}</strong>. O link expira em 15 minutos e só pode ser usado uma vez.</p>
<p style="margin:32px 0 0">${button(o.store, o.loginUrl, "Entrar na minha conta")}</p>
<p style="margin:24px 0 0;font-size:12px;color:#8a857b">Se você não pediu este e-mail, pode ignorá-lo.</p>`;
  const text = `Entrar em ${o.store.name}\n\n${o.loginUrl}\n\nO link expira em 15 minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail.`;
  return { subject: `Entrar em ${o.store.name}`, html: shell(o.store, "Seu link de acesso", body), text };
}

// F3.4: recuperação de carrinho abandonado
export function abandonedCartEmail(o: { store: StoreTheme; recoverUrl: string; unsubscribeUrl: string; items: Item[] }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Esqueceu algo no carrinho?</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">Separamos os itens do seu carrinho em <strong>${esc(o.store.name)}</strong>. Continue de onde parou:</p>
${itemsTable(o.items, o.items.reduce((s, i) => s + i.unitPriceInCents * i.quantity, 0))}
<p style="margin:32px 0 0">${button(o.store, o.recoverUrl, "Voltar ao carrinho")}</p>
<p style="margin:24px 0 0;font-size:12px;color:#8a857b"><a href="${esc(o.unsubscribeUrl)}" style="color:#8a857b">Não quero mais receber estes lembretes</a></p>`;
  const text = `Esqueceu algo no carrinho em ${o.store.name}?\n\n${o.items.map((i) => `${i.quantity}x ${i.productName}`).join("\n")}\n\nVoltar ao carrinho: ${o.recoverUrl}\n\nDescadastrar: ${o.unsubscribeUrl}`;
  return { subject: `Você esqueceu algo no carrinho — ${o.store.name}`, html: shell(o.store, "Seu carrinho ainda está aqui", body), text };
}

// F5.4: pedido criado, aguardando confirmação do pagamento (ex.: Pix/boleto assíncrono no Stripe —
// cartão confirma rápido e vai direto para orderConfirmationEmail, sem passar por aqui)
export function orderReceivedEmail(o: OrderMail) {
  const hello = o.customerName ? `Olá, ${esc(o.customerName.split(" ")[0])}!` : "Olá!";
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Recebemos seu pedido</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">${hello} Seu pedido <strong>#${esc(o.code)}</strong> foi registrado e está aguardando a confirmação do pagamento. Avisaremos por e-mail assim que ele for aprovado.</p>
${itemsTable(o.items, o.totalInCents)}
<p style="margin:32px 0 0">${button(o.store, o.orderUrl, "Acompanhar pedido")}</p>`;
  const text = `Pedido #${o.code} recebido — aguardando confirmação do pagamento.\n\n${o.items.map((i) => `${i.quantity}x ${i.productName} — ${formatBRL(i.unitPriceInCents * i.quantity)}`).join("\n")}\nTotal: ${formatBRL(o.totalInCents)}\n\nAcompanhe: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} recebido — ${o.store.name}`, html: shell(o.store, `Pedido #${o.code} aguardando pagamento`, body), text };
}

// F5.4: aviso de nova venda pro lojista (mesmo "shell" com a marca da própria loja)
export function newSaleNoticeEmail(o: { store: StoreTheme; code: string; totalInCents: number; items: Item[]; adminOrderUrl: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Nova venda! 🎉</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">O pedido <strong>#${esc(o.code)}</strong> acabou de ser pago.</p>
${itemsTable(o.items, o.totalInCents)}
<p style="margin:32px 0 0">${button(o.store, o.adminOrderUrl, "Ver pedido no painel")}</p>`;
  const text = `Nova venda — pedido #${o.code}\n\n${o.items.map((i) => `${i.quantity}x ${i.productName}`).join("\n")}\nTotal: ${formatBRL(o.totalInCents)}\n\nVer no painel: ${o.adminOrderUrl}`;
  return { subject: `Nova venda — pedido #${o.code}`, html: shell(o.store, `Pedido #${o.code} pago`, body), text };
}

export function orderCanceledEmail(o: { store: StoreTheme; code: string; orderUrl: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Pedido cancelado</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">O pedido <strong>#${esc(o.code)}</strong> foi cancelado. Se você não esperava por isso, entre em contato com a gente.</p>
<p style="margin:32px 0 0">${button(o.store, o.orderUrl, "Ver detalhes do pedido")}</p>`;
  const text = `Pedido #${o.code} cancelado.\n\nDetalhes: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} cancelado — ${o.store.name}`, html: shell(o.store, `Pedido #${o.code} cancelado`, body), text };
}

export function orderRefundedEmail(o: { store: StoreTheme; code: string; totalInCents: number; orderUrl: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Reembolso realizado</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">O pedido <strong>#${esc(o.code)}</strong> foi reembolsado no valor de <strong>${formatBRL(o.totalInCents)}</strong>. O valor pode levar alguns dias úteis para aparecer na sua fatura.</p>
<p style="margin:32px 0 0">${button(o.store, o.orderUrl, "Ver detalhes do pedido")}</p>`;
  const text = `Pedido #${o.code} reembolsado — ${formatBRL(o.totalInCents)}.\n\nDetalhes: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} reembolsado — ${o.store.name}`, html: shell(o.store, `Reembolso do pedido #${o.code}`, body), text };
}

// F5.4: confirma a entrega (o convite pra avaliar já é feito separadamente pelo cron de F3.6,
// com o link assinado do produto — aqui fica só a confirmação, pra não duplicar o pedido de avaliação)
export function deliveryConfirmationEmail(o: { store: StoreTheme; code: string; orderUrl: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">Seu pedido chegou!</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">O pedido <strong>#${esc(o.code)}</strong> foi entregue. Esperamos que você aproveite a compra em <strong>${esc(o.store.name)}</strong>!</p>
<p style="margin:32px 0 0">${button(o.store, o.orderUrl, "Ver pedido")}</p>`;
  const text = `Pedido #${o.code} entregue!\n\nVer pedido: ${o.orderUrl}`;
  return { subject: `Pedido #${o.code} entregue — ${o.store.name}`, html: shell(o.store, `Pedido #${o.code} entregue`, body), text };
}

// F3.6: pede avaliação alguns dias depois da entrega
export function reviewRequestEmail(o: { store: StoreTheme; code: string; reviewUrl: string; productName: string }) {
  const body = `<h1 style="margin:0 0 8px;font-size:26px">O que você achou?</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4a463e">Esperamos que esteja gostando do seu pedido <strong>#${esc(o.code)}</strong>. Conta pra gente o que achou de <strong>${esc(o.productName)}</strong>:</p>
<p style="margin:32px 0 0">${button(o.store, o.reviewUrl, "Avaliar produto")}</p>`;
  const text = `O que você achou do pedido #${o.code}?\n\nAvaliar "${o.productName}": ${o.reviewUrl}`;
  return { subject: `Avalie sua compra — ${o.store.name}`, html: shell(o.store, "Conta pra gente o que achou", body), text };
}
