import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin");
  }

  const shopId = (session.user as any).shopId as string;
  const shopRows = await db
    .select({ name: shops.name })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  const shopName = shopRows[0]?.name || "Print Shop";

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <AdminSidebar shopName={shopName} />
      <main className="flex-1 overflow-y-auto lg:ml-0 mt-14 lg:mt-0">
        {children}
      </main>
    </div>
  );
}
