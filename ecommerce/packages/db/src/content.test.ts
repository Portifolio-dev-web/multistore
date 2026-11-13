import { describe, expect, it } from "vitest";
import {
  defaultHomeSections,
  parseHomeSections,
  parseLegalAddress,
  parseNavigation,
  parseSocialLinks,
} from "./content";

describe("parseHomeSections", () => {
  it("aceita uma lista válida de seções", () => {
    const sections = [{ id: "a", type: "hero", title: "Bem-vindo", desktopImageUrl: "https://x.com/a.jpg" }];
    expect(parseHomeSections(sections)).toHaveLength(1);
  });

  it("descarta seção inválida sem derrubar as outras", () => {
    const sections = [
      { id: "a", type: "hero", title: "Bem-vindo", desktopImageUrl: "https://x.com/a.jpg" },
      { id: "b", type: "hero" /* falta title/desktopImageUrl */ },
      { id: "c", type: "tipo-inexistente" },
    ];
    expect(parseHomeSections(sections)).toHaveLength(1);
  });

  it("JSON que não é array nunca quebra — devolve lista vazia", () => {
    expect(parseHomeSections(null)).toEqual([]);
    expect(parseHomeSections({ foo: "bar" })).toEqual([]);
    expect(parseHomeSections("string qualquer")).toEqual([]);
  });

  it("valida productShowcase com os valores de source certos", () => {
    const valid = [{ id: "a", type: "productShowcase", source: "featured" }];
    const invalid = [{ id: "a", type: "productShowcase", source: "qualquer-coisa" }];
    expect(parseHomeSections(valid)).toHaveLength(1);
    expect(parseHomeSections(invalid)).toHaveLength(0);
  });
});

describe("defaultHomeSections", () => {
  it("gera um layout padrão válido (passa no próprio parser)", () => {
    const sections = defaultHomeSections();
    expect(sections.length).toBeGreaterThan(0);
    expect(parseHomeSections(sections)).toHaveLength(sections.length);
  });
});

describe("parseNavigation", () => {
  it("aceita itens válidos e descarta o resto", () => {
    const nav = [
      { id: "a", label: "Categorias", type: "category", value: "roupas" },
      { id: "b", label: "Sem tipo válido", type: "invalido", value: "x" },
    ];
    expect(parseNavigation(nav)).toHaveLength(1);
  });

  it("não-array nunca quebra", () => {
    expect(parseNavigation(undefined)).toEqual([]);
  });
});

describe("parseSocialLinks", () => {
  it("aceita links válidos", () => {
    expect(parseSocialLinks({ instagram: "https://instagram.com/loja" })).toEqual({ instagram: "https://instagram.com/loja" });
  });

  it("JSON inválido vira objeto vazio", () => {
    expect(parseSocialLinks({ instagram: "não é url" })).toEqual({});
    expect(parseSocialLinks(null)).toEqual({});
  });
});

describe("parseLegalAddress", () => {
  it("aceita endereço completo", () => {
    const addr = { zip: "01311-000", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP" };
    expect(parseLegalAddress(addr)).toEqual(addr);
  });

  it("endereço incompleto vira null", () => {
    expect(parseLegalAddress({ zip: "01311-000" })).toBeNull();
    expect(parseLegalAddress(null)).toBeNull();
  });
});
