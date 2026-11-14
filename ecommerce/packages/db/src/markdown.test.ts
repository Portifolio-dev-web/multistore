import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "./markdown";

describe("renderSafeMarkdown", () => {
  it("nunca executa HTML/script colado — vira texto escapado", () => {
    const html = renderSafeMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("converte títulos", () => {
    expect(renderSafeMarkdown("# Título")).toBe("<h1>Título</h1>");
    expect(renderSafeMarkdown("## Título")).toBe("<h2>Título</h2>");
    expect(renderSafeMarkdown("### Título")).toBe("<h3>Título</h3>");
  });

  it("converte negrito e itálico", () => {
    expect(renderSafeMarkdown("isto é **forte** e isto é *leve*")).toBe(
      "<p>isto é <strong>forte</strong> e isto é <em>leve</em></p>",
    );
  });

  it("converte lista não ordenada", () => {
    expect(renderSafeMarkdown("- um\n- dois")).toBe("<ul><li>um</li><li>dois</li></ul>");
  });

  it("converte link http(s)", () => {
    expect(renderSafeMarkdown("[clique aqui](https://exemplo.com)")).toBe(
      '<p><a href="https://exemplo.com" target="_blank" rel="noopener noreferrer">clique aqui</a></p>',
    );
  });

  it("recusa esquema javascript: no link — vira texto puro", () => {
    expect(renderSafeMarkdown("[clique](javascript:evil)")).toBe("<p>clique</p>");
  });

  it("escapa aspas na URL do link — não escapa do atributo href", () => {
    const html = renderSafeMarkdown('[x](http://a.com" onmouseover="alert(1))');
    expect(html).not.toContain('" onmouseover="');
    expect(html).toContain("&quot; onmouseover=&quot;");
  });

  it("junta linhas de um parágrafo com <br>", () => {
    expect(renderSafeMarkdown("linha um\nlinha dois")).toBe("<p>linha um<br>linha dois</p>");
  });

  it("separa parágrafos por linha em branco", () => {
    expect(renderSafeMarkdown("parágrafo um\n\nparágrafo dois")).toBe("<p>parágrafo um</p>\n<p>parágrafo dois</p>");
  });

  it("string vazia não quebra", () => {
    expect(renderSafeMarkdown("")).toBe("");
    expect(renderSafeMarkdown("   ")).toBe("");
  });
});
