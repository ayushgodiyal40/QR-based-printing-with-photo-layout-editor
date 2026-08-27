import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

  return NextResponse.json(orderRows[0]);
}
