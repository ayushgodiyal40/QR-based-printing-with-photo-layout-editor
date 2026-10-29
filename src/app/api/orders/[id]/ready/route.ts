import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyShop, notifyOrder } from "@/lib/sse";
import { audit } from "@/lib/audit";
import { getIp } from "@/lib/rate-limit";

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
  const files = await db
    .select({
      id: orderFiles.id,
      pageCount: orderFiles.pageCount,
      originalName: orderFiles.originalName,
    })
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), eq(orderFiles.isDeleted, false)));

  const totalFiles = files.length;
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 1), 0);

  // Transition from "uploading" to "received" once all files are ready from client side
  if (order.status === "uploading") {
    await db
      .update(orders)
      .set({
        status: "received",
        totalFiles,
        totalPages,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await audit({
      shopId: order.shopId,
      orderId,
      action: "order.ready",
      ipAddress: ip,
      details: { token: order.token, totalFiles, totalPages },
    });

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
        estimatedPrice: order.estimatedPrice,
        createdAt: order.createdAt,
      },
    });

    // Notify customer order tracking view
    notifyOrder(orderId, {
      event: "status_update",
      data: {
        status: "received",
        totalFiles,
        totalPages,
        estimatedPrice: order.estimatedPrice,
      },
    });
  }

  return NextResponse.json({
    success: true,
    orderId,
    status: "received",
    totalFiles,
    totalPages,
    estimatedPrice: order.estimatedPrice,
  });
}
