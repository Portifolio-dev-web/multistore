import { describe, expect, it } from "vitest";
import { CSV_HEADER, parseImportCsv, productsToCsv } from "./product-csv";

const product = {
  slug: "camiseta",
  name: "Camiseta",
  description: "Uma camiseta.",
  categories: [{ name: "Roupas" }],
  active: true,
  priceInCents: 4990,
  compareAtPriceInCents: null,
  promoStartsAt: null,
  promoEndsAt: null,
  images: ["https://exemplo.com/a.jpg"],
  variants: [
    { sku: "CAM-P", combination: { Tamanho: "P" }, priceInCents: null, compareAtPriceInCents: null, stock: 10 },
    { sku: "CAM-M", combination: { Tamanho: "M" }, priceInCents: 5990, compareAtPriceInCents: null, stock: 5 },
  ],
};

describe("productsToCsv", () => {
  it("gera uma linha por variante com o cabeçalho esperado", () => {
    const csv = productsToCsv([product]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CSV_HEADER.join(";"));
    expect(lines).toHaveLength(3); // cabeçalho + 2 variantes
    expect(lines[1]).toContain("CAM-P");
    expect(lines[2]).toContain("CAM-M");
    expect(lines[2]).toContain("59,90"); // preço da variante M sobrescrito
  });
});

describe("parseImportCsv", () => {
  it("roda de volta um export sem erros (round-trip)", () => {
    const csv = productsToCsv([product]);
    const { rows, errors } = parseImportCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { line: 2, sku: "CAM-P", priceInCents: null, compareAtPriceInCents: null, stock: 10, ok: true },
      { line: 3, sku: "CAM-M", priceInCents: 5990, compareAtPriceInCents: null, stock: 5, ok: true },
    ]);
  });

  it("ignora linha sem SKU e reporta o motivo", () => {
    const csv = [CSV_HEADER.join(";"), ";;;;;;;;;;;89,90;;;10"].join("\r\n");
    const { rows, errors } = parseImportCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/sem sku/i);
  });

  it("recusa estoque inválido", () => {
    const header = CSV_HEADER.join(";");
    const row = ["s", "n", "d", "c", "sim", "10,00", "", "", "", "", "SKU1", "{}", "", "", "abc"].join(";");
    const { rows, errors } = parseImportCsv([header, row].join("\r\n"));
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/estoque inválido/i);
  });

  it("recusa cabeçalho sem as colunas obrigatórias", () => {
    const { errors } = parseImportCsv("a;b;c\n1;2;3");
    expect(errors[0].message).toMatch(/cabeçalho inválido/i);
  });
});
