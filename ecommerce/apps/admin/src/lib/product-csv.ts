import { buildCsv, centsToInput, parseBRLToCents, parseCsv } from "@repo/db/utils";

// F2.6: uma linha por variante (produtos sem opções têm 1 variante, a padrão). Colunas do produto
// se repetem em cada linha — mais simples de ler/editar numa planilha do que um esquema aninhado.
export const CSV_HEADER = [
  "slug",
  "nome",
  "descricao",
  "categorias",
  "ativo",
  "preco",
  "preco_de",
  "promocao_inicio",
  "promocao_fim",
  "imagens",
  "variante_sku",
  "variante_combinacao",
  "variante_preco",
  "variante_preco_de",
  "variante_estoque",
] as const;

type ExportProduct = {
  slug: string;
  name: string;
  description: string;
  categories: { name: string }[];
  active: boolean;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  images: string[];
  variants: {
    sku: string | null;
    combination: unknown;
    priceInCents: number | null;
    compareAtPriceInCents: number | null;
    stock: number;
  }[];
};

const toDateCell = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function productsToCsv(products: ExportProduct[]): string {
  const rows = products.flatMap((p) =>
    p.variants.map((v) => [
      p.slug,
      p.name,
      p.description,
      p.categories.map((c) => c.name).join(", "),
      p.active ? "sim" : "nao",
      centsToInput(p.priceInCents),
      p.compareAtPriceInCents != null ? centsToInput(p.compareAtPriceInCents) : "",
      toDateCell(p.promoStartsAt),
      toDateCell(p.promoEndsAt),
      p.images.join(", "),
      v.sku ?? "",
      JSON.stringify(v.combination ?? {}),
      v.priceInCents != null ? centsToInput(v.priceInCents) : "",
      v.compareAtPriceInCents != null ? centsToInput(v.compareAtPriceInCents) : "",
      String(v.stock),
    ]),
  );
  return buildCsv([[...CSV_HEADER], ...rows]);
}

export type ImportRow = {
  line: number;
  sku: string;
  priceInCents: number | null;
  compareAtPriceInCents: number | null;
  stock: number;
  ok: true;
};
export type ImportRowError = { line: number; sku: string; message: string };
export type ImportParseResult = { rows: ImportRow[]; errors: ImportRowError[] };

/**
 * Valida o formato da linha (sem tocar no banco) — usado tanto na pré-visualização no navegador
 * quanto de novo no servidor antes de aplicar (nunca confia só no que veio do cliente).
 */
export function parseImportCsv(text: string): ImportParseResult {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], errors: [] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const skuCol = col("variante_sku");
  const priceCol = col("variante_preco");
  const compareCol = col("variante_preco_de");
  const stockCol = col("variante_estoque");

  if (skuCol === -1 || stockCol === -1) {
    return { rows: [], errors: [{ line: 1, sku: "", message: 'Cabeçalho inválido — faltam as colunas "variante_sku" e/ou "variante_estoque".' }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportRowError[] = [];

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const sku = (cells[skuCol] ?? "").trim();
    if (!sku) {
      errors.push({ line, sku: "", message: "Sem SKU — ignorada (importação atualiza só variantes com SKU)." });
      return;
    }

    const priceText = (cells[priceCol] ?? "").trim();
    const compareText = (cells[compareCol] ?? "").trim();
    const stockText = (cells[stockCol] ?? "").trim();

    const priceInCents = priceText ? parseBRLToCents(priceText) : null;
    const compareAtPriceInCents = compareText ? parseBRLToCents(compareText) : null;
    const stock = Number(stockText);

    if (priceText && !Number.isFinite(priceInCents)) {
      errors.push({ line, sku, message: `Preço inválido: "${priceText}".` });
      return;
    }
    if (compareText && !Number.isFinite(compareAtPriceInCents)) {
      errors.push({ line, sku, message: `Preço "de" inválido: "${compareText}".` });
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errors.push({ line, sku, message: `Estoque inválido: "${stockText}".` });
      return;
    }

    rows.push({ line, sku, priceInCents, compareAtPriceInCents, stock, ok: true });
  });

  return { rows, errors };
}
