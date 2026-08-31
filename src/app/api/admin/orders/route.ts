import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and, desc, asc, like, or, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions = [eq(orders.shopId, shopId)];

  if (status && status !== "all") {
    conditions.push(eq(orders.status, status as any));
  }

  const orderList = await db
    .select({
      id: orders.id,
      token: orders.token,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      status: orders.status,
      priority: orders.priority,
      colorMode: orders.colorMode,
      paperSize: orders.paperSize,
      copies: orders.copies,
      sides: orders.sides,
      totalFiles: orders.totalFiles,
      totalPages: orders.totalPages,
      estimatedPrice: orders.estimatedPrice,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      paymentReference: orders.paymentReference,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(
      sort === "oldest" ? asc(orders.createdAt) : desc(orders.createdAt)
    )
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ orders: orderList, page, limit });
}
