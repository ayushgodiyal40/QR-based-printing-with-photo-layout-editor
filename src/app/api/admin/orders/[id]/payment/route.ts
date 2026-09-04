import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { notifyShop, notifyOrder } from "@/lib/sse";
import { z } from "zod";

const VerifyPaymentSchema = z.object({
  action: z.enum(["confirm", "reject", "reset"]),
  paymentMethod: z.enum(["upi", "cash"]).default("upi"),
  confirmationMethod: z.enum(["SHOP_OWNER", "UTR_VERIFIED", "MANUAL", "UPI_RESPONSE"]).default("SHOP_OWNER"),
  note: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = (session.user as any).shopId as string;
  const userId = session.user.id as string;
  const { id } = await params;

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shopId)))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {}

  const parsed = VerifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, paymentMethod, confirmationMethod, note } = parsed.data;
  const now = new Date();
  const updates: Record<string, any> = { updatedAt: now };

  if (action === "confirm") {
    updates.paymentStatus = "PAID";
    updates.paymentMethod = paymentMethod;
    updates.paymentConfirmedTime = now;
    updates.paymentConfirmationMethod = confirmationMethod;
  } else if (action === "reject") {
    updates.paymentStatus = "FAILED";
  } else if (action === "reset") {
    updates.paymentStatus = "PENDING";
    updates.paymentConfirmedTime = null;
    updates.paymentConfirmationMethod = null;
  }

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning();

  await audit({
    shopId,
    orderId: id,
    userId,
    action: `payment.${action}`,
    details: {
      action,
      paymentMethod,
      confirmationMethod,
      note,
      paymentStatus: updated.paymentStatus,
    },
  });

  // Notify admin dashboard
  notifyShop(shopId, {
    event: "order_payment_updated",
    data: {
      orderId: id,
      token: updated.token,
      orderNumber: updated.orderNumber,
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      paymentConfirmationMethod: updated.paymentConfirmationMethod,
    },
  });

  // Notify customer's live tracking screen in real-time
  notifyOrder(id, {
    event: "payment_status_changed",
    data: {
      orderId: id,
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      paymentConfirmedTime: updated.paymentConfirmedTime,
    },
  });

  return NextResponse.json({
    success: true,
    order: updated,
    message: action === "confirm" ? "Payment confirmed successfully." : "Payment status updated.",
  });
}
