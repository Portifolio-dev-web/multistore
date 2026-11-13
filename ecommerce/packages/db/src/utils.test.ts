import { describe, expect, it } from "vitest";
import {
  averageRating,
  buildCsv,
  centsToInput,
  contrastText,
  cartesianCombinations,
  categoryAncestors,
  categoryDescendantIds,
  combinationKey,
  effectiveCompareAtPrice,
  effectivePrice,
  formatAddress,
  formatBRL,
  isPromoActive,
  isValidCpfOrCnpj,
  parseBRLToCents,
  parseCsv,
  promoDiscountPercent,
  slugify,
  variantLabel,
  waLink,
  WHATSAPP_PHONE,
} from "./utils";

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

describe("isValidCpfOrCnpj", () => {
  it("aceita CPF válido com máscara", () => {
    expect(isValidCpfOrCnpj("529.982.247-25")).toBe(true);
  });

  it("aceita CPF válido sem máscara", () => {
    expect(isValidCpfOrCnpj("52998224725")).toBe(true);
  });

  it("recusa CPF com todos os dígitos iguais", () => {
    expect(isValidCpfOrCnpj("111.111.111-11")).toBe(false);
  });

  it("recusa CPF com dígito verificador errado", () => {
    expect(isValidCpfOrCnpj("529.982.247-26")).toBe(false);
  });

  it("aceita CNPJ válido com máscara", () => {
    expect(isValidCpfOrCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("aceita CNPJ válido sem máscara", () => {
    expect(isValidCpfOrCnpj("11222333000181")).toBe(true);
  });

  it("recusa CNPJ com dígito verificador errado", () => {
    expect(isValidCpfOrCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("recusa quantidade de dígitos que não é CPF nem CNPJ", () => {
    expect(isValidCpfOrCnpj("123")).toBe(false);
  });
});

describe("isPromoActive", () => {
  const base = { priceInCents: 1000, compareAtPriceInCents: null, promoStartsAt: null, promoEndsAt: null };

  it("falso quando não há preço 'de'", () => {
    expect(isPromoActive(base)).toBe(false);
  });

  it("falso quando preço 'de' não é maior que o preço de venda", () => {
    expect(isPromoActive({ ...base, compareAtPriceInCents: 1000 })).toBe(false);
  });

  it("verdadeiro quando preço 'de' é maior, sem janela de datas", () => {
    expect(isPromoActive({ ...base, compareAtPriceInCents: 2000 })).toBe(true);
  });

  it("falso antes do início da promoção", () => {
    const now = new Date("2026-01-10");
    expect(isPromoActive({ ...base, compareAtPriceInCents: 2000, promoStartsAt: new Date("2026-01-15") }, now)).toBe(false);
  });

  it("falso depois do fim da promoção", () => {
    const now = new Date("2026-01-20");
    expect(isPromoActive({ ...base, compareAtPriceInCents: 2000, promoEndsAt: new Date("2026-01-15") }, now)).toBe(false);
  });

  it("verdadeiro dentro da janela de datas", () => {
    const now = new Date("2026-01-12");
    expect(
      isPromoActive(
        { ...base, compareAtPriceInCents: 2000, promoStartsAt: new Date("2026-01-10"), promoEndsAt: new Date("2026-01-15") },
        now,
      ),
    ).toBe(true);
  });
});

describe("promoDiscountPercent", () => {
  it("calcula o percentual de desconto arredondado", () => {
    expect(promoDiscountPercent(10000, 8000)).toBe(20);
  });
});

describe("categoryDescendantIds", () => {
  const tree = [
    { id: "roupas", parentId: null },
    { id: "camisetas", parentId: "roupas" },
    { id: "basicas", parentId: "camisetas" },
    { id: "calcados", parentId: null },
  ];

  it("inclui a própria categoria e todos os descendentes, em qualquer profundidade", () => {
    expect(categoryDescendantIds(tree, "roupas").sort()).toEqual(["basicas", "camisetas", "roupas"]);
  });

  it("categoria sem filhos retorna só ela mesma", () => {
    expect(categoryDescendantIds(tree, "calcados")).toEqual(["calcados"]);
  });
});

describe("categoryAncestors", () => {
  const tree = [
    { id: "roupas", name: "Roupas", parentId: null },
    { id: "camisetas", name: "Camisetas", parentId: "roupas" },
    { id: "basicas", name: "Básicas", parentId: "camisetas" },
  ];

  it("retorna a cadeia da raiz até a categoria, inclusive", () => {
    expect(categoryAncestors(tree, "basicas").map((c) => c.name)).toEqual(["Roupas", "Camisetas", "Básicas"]);
  });

  it("categoria raiz retorna só ela mesma", () => {
    expect(categoryAncestors(tree, "roupas").map((c) => c.name)).toEqual(["Roupas"]);
  });
});

describe("effectivePrice / effectiveCompareAtPrice", () => {
  const product = { priceInCents: 1000, compareAtPriceInCents: 1500 };

  it("variante sem override usa preço e 'de' do produto", () => {
    const variant = { priceInCents: null, compareAtPriceInCents: null };
    expect(effectivePrice(variant, product)).toBe(1000);
    expect(effectiveCompareAtPrice(variant, product)).toBe(1500);
  });

  it("variante com preço próprio usa o 'de' da própria variante, não o do produto", () => {
    const variant = { priceInCents: 2000, compareAtPriceInCents: null };
    expect(effectivePrice(variant, product)).toBe(2000);
    expect(effectiveCompareAtPrice(variant, product)).toBeNull();
  });
});

describe("variantLabel", () => {
  it("retorna null pra combinação vazia (variante padrão)", () => {
    expect(variantLabel({})).toBeNull();
  });

  it("junta os valores com ' / ', na ordem informada", () => {
    expect(variantLabel({ Tamanho: "M", Cor: "Azul" }, ["Cor", "Tamanho"])).toBe("Azul / M");
  });

  it("sem ordem informada, cai pra ordem alfabética das chaves", () => {
    expect(variantLabel({ Tamanho: "M", Cor: "Azul" })).toBe("Azul / M");
  });
});

describe("cartesianCombinations", () => {
  it("sem opções, retorna uma única combinação vazia (a variante padrão)", () => {
    expect(cartesianCombinations([])).toEqual([{}]);
  });

  it("uma opção gera uma combinação por valor", () => {
    expect(cartesianCombinations([{ name: "Cor", values: ["Azul", "Verde"] }])).toEqual([
      { Cor: "Azul" },
      { Cor: "Verde" },
    ]);
  });

  it("duas opções geram o produto cartesiano (2 cores x 3 tamanhos = 6)", () => {
    const combos = cartesianCombinations([
      { name: "Cor", values: ["Azul", "Verde"] },
      { name: "Tamanho", values: ["P", "M", "G"] },
    ]);
    expect(combos).toHaveLength(6);
    expect(combos).toContainEqual({ Cor: "Azul", Tamanho: "G" });
  });
});

describe("combinationKey", () => {
  it("é igual não importando a ordem das chaves", () => {
    expect(combinationKey({ Cor: "Azul", Tamanho: "M" })).toBe(combinationKey({ Tamanho: "M", Cor: "Azul" }));
  });

  it("combinações diferentes geram chaves diferentes", () => {
    expect(combinationKey({ Cor: "Azul" })).not.toBe(combinationKey({ Cor: "Verde" }));
  });
});

describe("buildCsv / parseCsv", () => {
  it("roda de volta linhas simples", () => {
    const csv = buildCsv([["a", "b"], ["1", "2"]]);
    expect(parseCsv(csv)).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("escapa e desescapa campo com o separador, aspas e quebra de linha", () => {
    const rows = [["tem; ponto e vírgula", 'tem "aspas"', "tem\nquebra"]];
    expect(parseCsv(buildCsv(rows))).toEqual(rows);
  });

  it("ignora o BOM no início do arquivo", () => {
    expect(parseCsv("﻿a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("ignora linhas em branco no fim", () => {
    expect(parseCsv("a;b\n1;2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("formatAddress", () => {
  it("formata o endereço estruturado novo (checkout próprio)", () => {
    const result = formatAddress({
      name: "Maria Lojista",
      zip: "01311-000",
      street: "Av. Paulista",
      number: "1000",
      complement: "ap. 101",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
    expect(result).toEqual([
      "Maria Lojista",
      "Av. Paulista, 1000",
      "ap. 101",
      "Bela Vista",
      "São Paulo - SP",
      "01311-000",
    ]);
  });

  it("formata o endereço antigo do Stripe (shipping_details)", () => {
    const result = formatAddress({
      name: "Cliente Teste",
      address: { line1: "Rua A, 123", city: "São Paulo", state: "SP", postal_code: "01311-000" },
    });
    expect(result).toEqual(["Cliente Teste", "Rua A, 123", "São Paulo - SP", "01311-000"]);
  });

  it("retorna lista vazia quando não há endereço", () => {
    expect(formatAddress(null)).toEqual([]);
  });
});

describe("waLink", () => {
  it("monta o link do wa.me só com dígitos e mensagem codificada", () => {
    expect(waLink("(11) 99999-9999", "Olá!")).toBe("https://wa.me/11999999999?text=Ol%C3%A1!");
  });
});

describe("WHATSAPP_PHONE", () => {
  it("aceita número com DDI", () => {
    expect(WHATSAPP_PHONE.test("5511999999999")).toBe(true);
  });

  it("recusa número muito curto", () => {
    expect(WHATSAPP_PHONE.test("123")).toBe(false);
  });
});

describe("averageRating", () => {
  it("calcula a média com uma casa decimal", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
  });

  it("retorna null sem avaliações", () => {
    expect(averageRating([])).toBeNull();
  });
});
