import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderFiles, orderNotes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { notifyShop, notifyOrder } from "@/lib/sse";
import { calculatePrice } from "@/lib/pricing";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const { id } = await params;

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shopId)))
    .limit(1);

  if (!orderRows.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const files = await db
    .select()
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, id), eq(orderFiles.isDeleted, false)));

  const notes = await db
    .select()
    .from(orderNotes)
    .where(eq(orderNotes.orderId, id));

  await audit({
    shopId,
    orderId: id,
    userId: session.user.id,
    action: "order.viewed",
  });

  return NextResponse.json({ order: orderRows[0], files, notes });
}

const UpdateOrderSchema = z.object({
  status: z.enum(["received","waiting","processing","printing","completed","cancelled","failed"]).optional(),
  priority: z.enum(["normal", "high"]).optional(),
  colorMode: z.enum(["bw", "color"]).optional(),
  paperSize: z.enum(["A4", "A3", "Letter", "Legal"]).optional(),
  copies: z.number().int().min(1).max(999).optional(),
  sides: z.enum(["single", "double"]).optional(),
  orientation: z.enum(["auto", "portrait", "landscape"]).optional(),
  pageRange: z.string().max(100).optional(),
  paymentStatus: z.enum(["unpaid", "paid", "refunded", "not_required"]).optional(),
  paymentMethod: z.string().max(20).optional(),
  paymentReference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const userId = session.user.id as string;
  const { id } = await params;

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shopId)))
    .limit(1);

  if (!orderRows.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data.", details: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.status) {
    updates.status = data.status;
    if (data.status === "completed") updates.completedAt = new Date();
  }
  if (data.priority) updates.priority = data.priority;
  if (data.colorMode) updates.colorMode = data.colorMode;
  if (data.paperSize) updates.paperSize = data.paperSize;
  if (data.copies) updates.copies = data.copies;
  if (data.orientation) updates.orientation = data.orientation;
  if (data.pageRange !== undefined) updates.pageRange = data.pageRange;
  if (data.paymentStatus) updates.paymentStatus = data.paymentStatus;
  if (data.paymentMethod) updates.paymentMethod = data.paymentMethod;
  if (data.paymentReference !== undefined) updates.paymentReference = data.paymentReference;

  // Recalculate price if print settings changed
  if (data.colorMode || data.paperSize || data.copies || data.sides) {
    const order = orderRows[0];
    const price = await calculatePrice(shopId, {
      pages: order.totalPages || 1,
      colorMode: (data.colorMode || order.colorMode) as "bw" | "color",
      paperSize: (data.paperSize || order.paperSize) as "A4" | "A3" | "Letter" | "Legal",
      copies: data.copies || order.copies,
      sides: (data.sides || order.sides) as "single" | "double",
    });
    updates.estimatedPrice = price.toString();
  }

  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(eq(orders.id, id))
    .returning();

  // Add note if provided
  if (data.note) {
    await db.insert(orderNotes).values({
      orderId: id,
      userId,
      note: data.note,
    });
  }

  await audit({
    shopId,
    orderId: id,
    userId,
    action: data.status ? "order.status_changed" : "order.settings_changed",
    details: data,
  });

  // Notify SSE subscribers
  const ssePayload = { orderId: id, status: updated.status, ...updates };
  notifyShop(shopId, { event: "order_updated", data: ssePayload });
  notifyOrder(id, { event: "status_update", data: { status: updated.status } });

  return NextResponse.json({ order: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const userId = session.user.id as string;
  const { id } = await params;

  const orderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shopId)))
    .limit(1);

  if (!orderRows.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Query file storage paths before deletion for background cleanup
  const filesToDelete = await db
    .select({ storagePath: orderFiles.storagePath })
    .from(orderFiles)
    .where(eq(orderFiles.orderId, id));

  // Perform database deletion (DB cascades delete to order_files and order_notes)
  await db.delete(orders).where(eq(orders.id, id));

  // Audit without foreign key violation (avoid orderId column referencing deleted orders row)
  audit({
    shopId,
    userId,
    action: "order.deleted",
    details: { deletedOrderId: id },
  }).catch(() => {});

  // Real-time broadcast to all connected admin tabs
  try {
    notifyShop(shopId, { event: "order_deleted", data: { orderId: id } });
  } catch {}

  // Asynchronously clean up files from storage without delaying response
  if (filesToDelete.length > 0) {
    import("@/lib/storage").then(({ deleteFile }) => {
      Promise.all(filesToDelete.map((f) => deleteFile(f.storagePath).catch(() => {}))).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
