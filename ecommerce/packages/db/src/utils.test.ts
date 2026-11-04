import { describe, expect, it } from "vitest";
import { centsToInput, contrastText, formatBRL, parseBRLToCents, slugify } from "./utils";

describe("parseBRLToCents", () => {
  it("converte formato brasileiro com vírgula e milhar", () => {
    expect(parseBRLToCents("1.299,90")).toBe(129990);
  });

  it("converte formato só com ponto decimal", () => {
    expect(parseBRLToCents("1299.90")).toBe(129990);
  });

  it("converte inteiro sem separador", () => {
    expect(parseBRLToCents("1299")).toBe(129900);
  });

  it("ignora o prefixo 'R$'", () => {
    expect(parseBRLToCents("R$ 49,90")).toBe(4990);
  });

  it("retorna NaN para entrada inválida", () => {
    expect(parseBRLToCents("1.2.3")).toBeNaN();
  });
});

describe("centsToInput", () => {
  it("formata centavos como string com vírgula", () => {
    expect(centsToInput(129990)).toBe("1299,90");
  });

  it("é o inverso de parseBRLToCents para valores redondos", () => {
    expect(centsToInput(4990)).toBe("49,90");
  });
});

describe("formatBRL", () => {
  it("formata centavos como moeda brasileira", () => {
    expect(formatBRL(129990)).toContain("1.299,90");
  });
});

describe("slugify", () => {
  it("remove acentos e espaços", () => {
    expect(slugify("Loja Inovação & Café")).toBe("loja-inovacao-cafe");
  });

  it("trunca em 48 caracteres", () => {
    const longo = "a".repeat(60);
    expect(slugify(longo).length).toBe(48);
  });

  it("remove hífens nas pontas", () => {
    expect(slugify("--teste--")).toBe("teste");
  });
});

describe("contrastText", () => {
  it("retorna preto sobre fundo claro", () => {
    expect(contrastText("#f59e0b")).toBe("#111111");
  });

  it("retorna branco sobre fundo escuro", () => {
    expect(contrastText("#1f2937")).toBe("#ffffff");
  });

  it("retorna branco para hex inválido", () => {
    expect(contrastText("not-a-color")).toBe("#ffffff");
  });
});
