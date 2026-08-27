import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { deleteFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

/**
 * Delete files for expired/completed orders past retention period.
 * Should be called by a cron or on-demand.
 */
export async function runFileCleanup(shopId?: string) {
  const now = new Date();

  // Find orders past expiry with un-deleted files
  const expiredOrders = await db
    .select({ id: orders.id, shopId: orders.shopId })
    .from(orders)
    .where(
      and(
        lt(orders.expiresAt, now)
      )
    );

  for (const order of expiredOrders) {
    if (shopId && order.shopId !== shopId) continue;

    // Mark order as expired
    await db
      .update(orders)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await deleteOrderFiles(order.id, order.shopId);
  }

  // Also clean up completed orders whose files should be deleted
  const completedOrders = await db
    .select({ id: orders.id, shopId: orders.shopId, completedAt: orders.completedAt })
    .from(orders)
    .where(eq(orders.status, "completed" as any));

  for (const order of completedOrders) {
    if (shopId && order.shopId !== shopId) continue;
    if (!order.completedAt) continue;

    // Get retention hours from shop settings (default 24h)
    const retentionHours = 24;
    const retentionMs = retentionHours * 60 * 60 * 1000;
    const deleteAfter = new Date(order.completedAt.getTime() + retentionMs);

    if (now > deleteAfter) {
      await deleteOrderFiles(order.id, order.shopId);
    }
  }
}

async function deleteOrderFiles(orderId: string, shopId: string) {
  const files = await db
    .select()
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), eq(orderFiles.isDeleted, false)));

  for (const file of files) {
    await deleteFile(file.storagePath);
    await db
      .update(orderFiles)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(orderFiles.id, file.id));

    await audit({
      shopId,
      orderId,
      action: "file.deleted",
      details: { fileName: file.originalName, reason: "retention_policy" },
    });
  }
}
