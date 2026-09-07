import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runFileCleanup, purgeLegacyFileData } from "@/lib/cleanup";
import { db } from "@/lib/db";
import { orderFiles, orders } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;

  try {
    // 1. Run standard expiry cleanup
    await runFileCleanup(shopId);

    // 2. Clear fileData on all already-deleted records
    await purgeLegacyFileData(shopId);

    // 3. Clear fileData for all orders marked as "completed" to reclaim Neon database quota
    await db
      .update(orderFiles)
      .set({ fileData: null })
      .where(
        and(
          eq(orderFiles.isDeleted, false),
          sql`${orderFiles.orderId} IN (SELECT id FROM ${orders} WHERE shop_id = ${shopId} AND status = 'completed')`
        )
      );

    return NextResponse.json({
      success: true,
      message: "Storage cleanup completed successfully. File payloads purged from database.",
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to run maintenance cleanup: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
