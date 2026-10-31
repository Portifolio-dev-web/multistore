import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) redirect("/login");

  const base = process.env.STOREFRONT_URL?.replace(/\/$/, "");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar storeName={store.name} email={session.email} brandColor={store.primaryColor} storeUrl={base ? `${base}/${store.slug}` : null} />
      <main className="min-w-0 px-5 py-8 sm:px-10 lg:py-12">{children}</main>
    </div>
  );
}
