// F4.3: conversor Markdown -> HTML minimalista e seguro, sem dependência nova (o subconjunto é
// pequeno o bastante). Escapa `&`/`<`/`>` ANTES de qualquer transformação — HTML ou <script> colado
// no conteúdo nunca vira tag de verdade, só aparece como texto visível. As únicas tags que saem daqui
// vêm do código abaixo, nunca do texto do usuário.

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  let out = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, url: string) => {
    // só http(s) ou caminho relativo — nunca javascript:/data: etc.
    if (!/^(https?:\/\/|\/)/.test(url)) return label;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return out;
}

/** Nunca lança e nunca deixa HTML/script do usuário virar tag de verdade. */
export function renderSafeMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown.trim());
  if (!escaped) return "";

  const blocks = escaped.split(/\n{2,}/);
  const html = blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return "";

      const headingMatch = lines.length === 1 ? lines[0].match(/^(#{1,3})\s+(.+)$/) : null;
      if (headingMatch) {
        const level = headingMatch[1].length;
        return `<h${level}>${renderInline(headingMatch[2])}</h${level}>`;
      }

      if (lines.every((l) => /^[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li>${renderInline(l.replace(/^[-*]\s+/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }

      return `<p>${lines.map(renderInline).join("<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}
