import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and, gte, count, sum } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's orders
  const todayOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      colorMode: orders.colorMode,
      totalPages: orders.totalPages,
      estimatedPrice: orders.estimatedPrice,
    })
    .from(orders)
    .where(and(eq(orders.shopId, shopId), gte(orders.createdAt, todayStart)));

  const totalOrders = todayOrders.length;
  const totalPages = todayOrders.reduce((s, o) => s + (o.totalPages || 0), 0);
  const totalRevenue = todayOrders.reduce(
    (s, o) => s + parseFloat(o.estimatedPrice as string || "0"),
    0
  );
  const bwPages = todayOrders
    .filter((o) => o.colorMode === "bw")
    .reduce((s, o) => s + (o.totalPages || 0), 0);
  const colorPages = todayOrders
    .filter((o) => o.colorMode === "color")
    .reduce((s, o) => s + (o.totalPages || 0), 0);
  const pendingOrders = todayOrders.filter((o) =>
    ["received", "waiting", "processing", "printing"].includes(o.status)
  ).length;
  const completedOrders = todayOrders.filter((o) => o.status === "completed").length;

  // All-time pending count
  const allPendingRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.shopId, shopId),
        // status in received, waiting, processing, printing
      )
    );

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
