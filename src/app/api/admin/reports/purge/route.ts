import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderFiles, orderNotes } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { notifyShop } from "@/lib/sse";
import { deleteFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const userId = session.user.id as string;
  const role = (session.user as any).role;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only shop owners can purge historical orders." }, { status: 403 });
  }

  // 1. Fetch all order IDs belonging to this shop
  const shopOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.shopId, shopId));

  if (shopOrders.length === 0) {
    return NextResponse.json({ success: true, count: 0, message: "No orders to delete." });
  }

  const orderIds = shopOrders.map((o) => o.id);

  // 2. Fetch all file storage paths for these orders to delete from disk
  const filesToDelete = await db
    .select({ storagePath: orderFiles.storagePath })
    .from(orderFiles)
    .where(inArray(orderFiles.orderId, orderIds));

  // 3. Delete files from physical storage
  if (filesToDelete.length > 0) {
    Promise.all(filesToDelete.map((f) => deleteFile(f.storagePath).catch(() => {}))).catch(() => {});
  }

  // 4. Delete associated order notes and files
  await db.delete(orderNotes).where(inArray(orderNotes.orderId, orderIds)).catch(() => {});
  await db.delete(orderFiles).where(inArray(orderFiles.orderId, orderIds)).catch(() => {});

  // 5. Delete all orders for this shop
  await db.delete(orders).where(eq(orders.shopId, shopId));

  // 6. Audit log
  await audit({
    shopId,
    userId,
    action: "order.deleted",
    details: { action: "purge_all_past_orders", count: orderIds.length },
  });

  // 7. Broadcast SSE event
  try {
    notifyShop(shopId, { event: "orders_purged", data: { count: orderIds.length } });
  } catch {}

  return NextResponse.json({
    success: true,
    count: orderIds.length,
    message: `Successfully cleared ${orderIds.length} past order(s). Future orders will be recorded fresh.`,
  });
}
