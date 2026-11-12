import { centsToInput } from "@repo/db/utils";
import type { VariantRow } from "@/components/variants-grid";

// Fica fora de variants-grid.tsx (que é "use client") porque Server Component não pode
// chamar função exportada de um módulo client — vira só uma referência, não a função de verdade.
export function toVariantRow(v: {
  id: string;
  label: string | null;
  sku: string | null;
  priceInCents: number | null;
  compareAtPriceInCents: number | null;
  stock: number;
}): VariantRow {
  return {
    id: v.id,
    label: v.label,
    sku: v.sku ?? "",
    priceInCents: v.priceInCents ? centsToInput(v.priceInCents) : "",
    compareAtPriceInCents: v.compareAtPriceInCents ? centsToInput(v.compareAtPriceInCents) : "",
    stock: String(v.stock),
  };
}
