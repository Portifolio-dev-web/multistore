import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CsvImportForm } from "@/components/csv-import-form";

export default function ImportExportPage() {
  return (
    <>
      <Link href="/products" className="font-mono text-xs text-ink/50 hover:text-ink" data-testid="back-to-products-link">← produtos</Link>
      <PageHeader title="Importar / exportar" subtitle="Catálogo em CSV (separador ponto e vírgula, abre direto no Excel)." />

      <section className="card max-w-2xl p-6">
        <h2 className="mb-2 font-semibold">Exportar</h2>
        <p className="mb-4 text-sm text-ink/60">Baixa todos os produtos e variações da loja.</p>
        <a href="/api/products/export" className="btn-outline" data-testid="csv-export-link">Exportar CSV</a>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Importar</h2>
        <p className="mb-4 text-sm text-ink/60">
          Atualiza preço, preço &quot;de&quot; e estoque das variações existentes pelo SKU — não cria produtos novos.
        </p>
        <CsvImportForm />
      </section>
    </>
  );
}
