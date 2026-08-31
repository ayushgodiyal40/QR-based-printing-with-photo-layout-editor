import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyShop } from "@/lib/sse";
import { audit } from "@/lib/audit";
import { z } from "zod";

const PaySchema = z.object({
  paymentMethod: z.enum(["cash", "upi"]).default("upi"),
  paymentReference: z.string().max(100).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {}

  const parsed = PaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment data." }, { status: 400 });
  }

  const orderRows = await db
    .select({
      id: orders.id,
      shopId: orders.shopId,
      token: orders.token,
      orderNumber: orders.orderNumber,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const order = orderRows[0];
  const updates: Record<string, any> = {
    paymentMethod: parsed.data.paymentMethod,
    updatedAt: new Date(),
  };

  if (parsed.data.paymentReference) {
    updates.paymentReference = parsed.data.paymentReference;
  }

  // If customer confirmed paying online via UPI, we mark it as paid or keep reference
  // so operator and soundbox can verify
  if (parsed.data.paymentMethod === "upi") {
    updates.paymentStatus = "paid";
  }

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning();

  await audit({
    shopId: order.shopId,
    orderId: id,
    action: "payment.reported_by_customer",
    details: parsed.data,
  });

  // Notify admin dashboard via SSE
  notifyShop(order.shopId, {
    event: "order_payment_updated",
    data: {
      orderId: id,
      token: order.token,
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      paymentReference: updated.paymentReference,
    },
  });

  return NextResponse.json({ success: true, order: updated });
}
