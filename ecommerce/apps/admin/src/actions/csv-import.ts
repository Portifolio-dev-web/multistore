"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { parseImportCsv } from "@/lib/product-csv";

export type ImportState = { success?: string; error?: string; report?: string[] };

export async function importProductsCsv(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { storeId } = await requireSession();
  const csvText = formData.get("csvText");
  if (typeof csvText !== "string" || !csvText.trim()) return { error: "Selecione um arquivo CSV." };

  // Nunca confia só na pré-visualização do navegador: revalida o arquivo inteiro de novo aqui.
  const { rows, errors: parseErrors } = parseImportCsv(csvText);
  const errorLines = parseErrors.map((e) => `linha ${e.line}: ${e.message}`);
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const { count } = await tx.productVariant.updateMany({
        where: { sku: row.sku, product: { storeId } },
        data: { priceInCents: row.priceInCents, compareAtPriceInCents: row.compareAtPriceInCents, stock: row.stock },
      });
      if (count > 0) updated++;
      else errorLines.push(`linha ${row.line}: SKU "${row.sku}" não encontrado nesta loja.`);
    }
  });

  revalidatePath("/products");
  const summary = `${updated} variação(ões) atualizada(s)${errorLines.length ? `, ${errorLines.length} ignorada(s)` : ""}.`;
  return { success: summary, report: errorLines };
}
