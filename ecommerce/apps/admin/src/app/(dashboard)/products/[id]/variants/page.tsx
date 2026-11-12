import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { variantLabel } from "@repo/db/utils";
import { requireSession } from "@/lib/session";
import { updateProductOptions, updateProductVariants } from "@/actions/variants";
import { PageHeader } from "@/components/page-header";
import { OptionsEditor } from "@/components/options-editor";
import { VariantsGrid } from "@/components/variants-grid";
import { toVariantRow } from "@/lib/variant-row";

export default async function ProductVariantsPage({ params }: { params: { id: string } }) {
  const { storeId } = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: params.id, storeId },
    include: { options: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } } },
  });
  if (!product) notFound();

  const optionNames = product.options.map((o) => o.name);
  const optionRows = product.options.map((o) => ({ name: o.name, valuesText: o.values.join(", ") }));
  const variantRows = product.variants.map((v) =>
    toVariantRow({
      id: v.id,
      label: variantLabel(v.combination as Record<string, string>, optionNames),
      sku: v.sku,
      priceInCents: v.priceInCents,
      compareAtPriceInCents: v.compareAtPriceInCents,
      stock: v.stock,
    }),
  );

  return (
    <>
      <Link href={`/products/${product.id}`} className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-product-link">← {product.name}</Link>
      <PageHeader title="Variações" subtitle={product.name} />

      <section className="card max-w-3xl p-6">
        <h2 className="mb-4 font-semibold">Opções</h2>
        <OptionsEditor action={updateProductOptions.bind(null, product.id)} initial={optionRows} />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-semibold">Variações ({product.variants.length})</h2>
        <VariantsGrid
          key={variantRows.map((r) => r.id).join(",")}
          action={updateProductVariants.bind(null, product.id)}
          initial={variantRows}
        />
      </section>
    </>
  );
}
