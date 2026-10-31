import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { storeUrl } from "@repo/db/urls";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) redirect("/login");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar storeName={store.name} email={session.email} brandColor={store.primaryColor} storeUrl={storeUrl(store)} />
      <main className="min-w-0 px-5 py-8 sm:px-10 lg:py-12">{children}</main>
    </div>
  );
}
