import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminSidebar from "@/components/admin/AdminSidebar";
import TopProgressBar from "@/components/admin/TopProgressBar";

// Fast in-memory shop name cache to avoid DB roundtrips to Neon on every layout render
const shopNameCache = new Map<string, { name: string; expiry: number }>();

async function getCachedShopName(shopId: string): Promise<string> {
  const cached = shopNameCache.get(shopId);
  const now = Date.now();
  if (cached && cached.expiry > now) {
    return cached.name;
  }

  try {
    const shopRows = await db
      .select({ name: shops.name })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    const name = shopRows[0]?.name || "Print Shop";
    shopNameCache.set(shopId, { name, expiry: now + 5 * 60 * 1000 }); // Cache for 5 minutes
    return name;
  } catch (err) {
    return cached?.name || "Print Shop";
  }
}

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
  // If shopName is already baked into the JWT session, use it instantly (0ms, 0 DB roundtrip)
  const sessionShopName = (session.user as any).shopName;
  const shopName = sessionShopName || (await getCachedShopName(shopId));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black overflow-hidden">
      <TopProgressBar />
      <AdminSidebar shopName={shopName} />
      <main className="flex-1 overflow-y-auto lg:ml-0 mt-14 lg:mt-0">
        {children}
      </main>
    </div>
  );
}
