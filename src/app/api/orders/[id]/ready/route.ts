import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyShop, notifyOrder } from "@/lib/sse";
import { audit } from "@/lib/audit";
import { getIp } from "@/lib/rate-limit";
import { calculatePrice } from "@/lib/pricing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const ip = getIp(req);

  // Fetch the order
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const order = orderRows[0];

  // Fetch all active files for this order
  const fileRows = await db
    .select({
      id: orderFiles.id,
      pageCount: orderFiles.pageCount,
      originalName: orderFiles.originalName,
      sizeBytes: orderFiles.sizeBytes,
    })
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), eq(orderFiles.isDeleted, false)));

  // Deduplicate files by originalName and sizeBytes to guarantee clean calculations
  const seenFiles = new Set<string>();
  const files: typeof fileRows = [];
  for (const f of fileRows) {
    const key = `${f.originalName}_${f.sizeBytes}`;
    if (!seenFiles.has(key)) {
      seenFiles.add(key);
      files.push(f);
    }
  }

  const totalFiles = files.length;
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 1), 0);

  const price = await calculatePrice(order.shopId, {
    pages: totalPages,
    colorMode: order.colorMode,
    paperSize: order.paperSize,
    copies: order.copies,
    sides: order.sides,
  });
  const estimatedPriceStr = price.toFixed(2);
  const targetStatus = order.status === "uploading" ? "received" : order.status;

  // Always persist authoritative totals and price to database
  await db
    .update(orders)
    .set({
      status: targetStatus,
      totalFiles,
      totalPages,
      estimatedPrice: estimatedPriceStr,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  // Non-blocking background audit logging
  audit({
    shopId: order.shopId,
    orderId,
    action: "order.ready",
    ipAddress: ip,
    details: { token: order.token, totalFiles, totalPages, estimatedPrice: estimatedPriceStr },
  }).catch(() => {});

  if (order.status === "uploading") {
    // Broadcast new_order to live queue now that all files are complete & ready
    notifyShop(order.shopId, {
      event: "new_order",
      data: {
        id: order.id,
        orderId: order.id,
        token: order.token,
        orderNumber: order.orderNumber,
        customerName: order.customerName || "Walk-in",
        customerPhone: order.customerPhone,
        status: "received",
        priority: order.priority,
        colorMode: order.colorMode,
        paperSize: order.paperSize,
        copies: order.copies,
        sides: order.sides,
        totalFiles,
        totalPages,
        estimatedPrice: estimatedPriceStr,
        createdAt: order.createdAt,
      },
    });
  } else {
    // Broadcast updated order state if files were added
    notifyShop(order.shopId, {
      event: "order_updated",
      data: {
        orderId: order.id,
        totalFiles,
        totalPages,
        estimatedPrice: estimatedPriceStr,
      },
    });
  }

  // Notify customer order tracking view
  notifyOrder(orderId, {
    event: "status_update",
    data: {
      status: targetStatus,
      totalFiles,
      totalPages,
      estimatedPrice: estimatedPriceStr,
    },
  });

  return NextResponse.json({
    success: true,
    orderId,
    status: targetStatus,
    totalFiles,
    totalPages,
    estimatedPrice: estimatedPriceStr,
  });
}
