import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and, gte, or } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's orders (includes all orders placed or completed today; metrics are permanently retained even when order is completed and deleted from active queue)
  const todayOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      colorMode: orders.colorMode,
      totalPages: orders.totalPages,
      estimatedPrice: orders.estimatedPrice,
      isDeleted: orders.isDeleted,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.shopId, shopId),
        or(
          gte(orders.createdAt, todayStart),
          gte(orders.completedAt, todayStart)
        )
      )
    );

  // Retain metrics for today excluding incomplete uploading drafts
  const readyTodayOrders = todayOrders.filter((o) => o.status !== "uploading");
  const totalOrders = readyTodayOrders.length;
  const totalPages = readyTodayOrders.reduce((s: number, o: any) => s + (o.totalPages || 0), 0);
  const totalRevenue = readyTodayOrders.reduce(
    (s: number, o: any) => s + parseFloat((o.estimatedPrice as string) || "0"),
    0
  );
  const bwPages = readyTodayOrders
    .filter((o: any) => o.colorMode === "bw")
    .reduce((s: number, o: any) => s + (o.totalPages || 0), 0);
  const colorPages = readyTodayOrders
    .filter((o: any) => o.colorMode === "color")
    .reduce((s: number, o: any) => s + (o.totalPages || 0), 0);

  // Pending queue count only includes active, non-deleted orders
  const pendingOrders = todayOrders.filter(
    (o: any) => !o.isDeleted && ["received", "waiting", "processing", "printing"].includes(o.status)
  ).length;
  const completedOrders = todayOrders.filter((o: any) => o.status === "completed").length;

  return NextResponse.json({
    today: {
      orders: totalOrders,
      pages: totalPages,
      revenue: Math.round(totalRevenue * 100) / 100,
      bwPages,
      colorPages,
      pendingOrders,
      completedOrders,
    },
  });
}
