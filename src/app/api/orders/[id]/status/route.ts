import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

import { generateSignedToken } from "@/lib/signed-url";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderRows = await db
    .select({
      id: orders.id,
      token: orders.token,
      orderNumber: orders.orderNumber,
      status: orders.status,
      customerName: orders.customerName,
      colorMode: orders.colorMode,
      paperSize: orders.paperSize,
      copies: orders.copies,
      sides: orders.sides,
      totalFiles: orders.totalFiles,
      totalPages: orders.totalPages,
      estimatedPrice: orders.estimatedPrice,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const fileRows = await db
    .select({
      id: orderFiles.id,
      originalName: orderFiles.originalName,
      mimeType: orderFiles.mimeType,
      sizeBytes: orderFiles.sizeBytes,
      pageCount: orderFiles.pageCount,
      imageWidth: orderFiles.imageWidth,
      imageHeight: orderFiles.imageHeight,
    })
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, id), eq(orderFiles.isDeleted, false)));

  const filesWithUrls = fileRows.map((f) => ({
    ...f,
    url: `/api/files/serve?token=${generateSignedToken(f.id, id, 3600)}`,
  }));

  return NextResponse.json({
    ...orderRows[0],
    files: filesWithUrls,
  });
}
