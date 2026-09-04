import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyShop } from "@/lib/sse";
import { audit } from "@/lib/audit";
import { z } from "zod";

const CustomerPaySchema = z.object({
  paymentMethod: z.enum(["cash", "upi"]).default("upi"),
  utr: z.string().trim().max(50).optional(),
  paymentReference: z.string().trim().max(100).optional(),
  upiTransactionId: z.string().trim().max(100).optional(),
  upiReferenceNumber: z.string().trim().max(100).optional(),
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

  const parsed = CustomerPaySchema.safeParse(body);
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
      estimatedPrice: orders.estimatedPrice,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const order = orderRows[0];
  const now = new Date();
  const utrValue = parsed.data.utr || parsed.data.paymentReference || undefined;

  const updates: Record<string, any> = {
    paymentMethod: parsed.data.paymentMethod,
    updatedAt: now,
  };

  if (utrValue) {
    updates.utr = utrValue;
    updates.paymentReference = utrValue;
  }
  if (parsed.data.upiTransactionId) {
    updates.upiTransactionId = parsed.data.upiTransactionId;
  }
  if (parsed.data.upiReferenceNumber) {
    updates.upiReferenceNumber = parsed.data.upiReferenceNumber;
  }

  // SECURITY RULE: Never mark order as PAID from customer submission alone.
  // Move to VERIFICATION_REQUIRED so shop owner verifies with PhonePe Soundbox.
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "paid") {
    if (parsed.data.paymentMethod === "upi") {
      updates.paymentStatus = "VERIFICATION_REQUIRED";
      updates.paymentAttemptTime = now;
    } else {
      updates.paymentStatus = "PENDING";
    }
  }

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning();

  await audit({
    shopId: order.shopId,
    orderId: id,
    action: "payment.verification_requested",
    details: {
      paymentMethod: parsed.data.paymentMethod,
      utr: utrValue,
      status: updated.paymentStatus,
    },
  });

  // Notify shop dashboard in real-time
  notifyShop(order.shopId, {
    event: "order_payment_verifying",
    data: {
      orderId: id,
      token: order.token,
      orderNumber: order.orderNumber,
      amount: updated.estimatedPrice,
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      utr: updated.utr,
      paymentReference: updated.paymentReference,
    },
  });

  return NextResponse.json({
    success: true,
    paymentStatus: updated.paymentStatus,
    message: "Payment submitted. Verification required by shop owner via Soundbox.",
    order: updated,
  });
}
