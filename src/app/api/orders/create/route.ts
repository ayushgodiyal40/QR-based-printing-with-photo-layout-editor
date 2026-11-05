import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, shops } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { generateToken, generateOrderNumber } from "@/lib/tokens";
import { orderLimiter, getIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { notifyShop } from "@/lib/sse";
import { z } from "zod";

const CreateOrderSchema = z.object({
  shopId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(128),
  orderId: z.string().uuid().optional(),
  token: z.string().regex(/^[0-9]{4}$/).optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  colorMode: z.enum(["bw", "color"]).default("bw"),
  paperSize: z.enum(["A4", "A3", "Letter", "Legal"]).default("A4"),
  copies: z.number().int().min(1).max(999).default(1),
  sides: z.enum(["single", "double"]).default("single"),
  orientation: z.enum(["auto", "portrait", "landscape"]).default("auto"),
  pageRange: z.string().max(100).optional(),
  pagesPerSheet: z.number().int().min(1).max(16).default(1),
  scaling: z.string().default("fit"),
});

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const limiter = orderLimiter(ip);
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many orders. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order data.", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // 1. Idempotency check: if order with this idempotencyKey already exists, return it immediately
  const existing = await db
    .select({ id: orders.id, token: orders.token, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.idempotencyKey, data.idempotencyKey))
    .limit(1);

  if (existing.length) {
    return NextResponse.json({
      orderId: existing[0].id,
      token: existing[0].token,
      orderNumber: existing[0].orderNumber,
      isExisting: true,
    });
  }

  // 2. Token determination
  let token = data.token || generateToken();

  // If a specific token was requested, verify no active collision exists in this shop
  if (data.token) {
    const conflict = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.shopId, data.shopId),
          eq(orders.token, token),
          eq(orders.isDeleted, false),
          ne(orders.status, "completed"),
          ne(orders.status, "cancelled")
        )
      )
      .limit(1);

    if (conflict.length > 0) {
      token = generateToken();
    }
  }

  const orderNumber = generateOrderNumber(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const orderId = data.orderId || crypto.randomUUID();

  let newOrder: any;
  try {
    const [inserted] = await db
      .insert(orders)
      .values({
        id: orderId,
        shopId: data.shopId,
        token,
        orderNumber,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        colorMode: data.colorMode,
        paperSize: data.paperSize as any,
        copies: data.copies,
        sides: data.sides,
        orientation: data.orientation,
        pageRange: data.pageRange || null,
        pagesPerSheet: data.pagesPerSheet,
        scaling: data.scaling,
        idempotencyKey: data.idempotencyKey,
        expiresAt,
        status: "uploading",
      })
      .returning({
        id: orders.id,
        token: orders.token,
        orderNumber: orders.orderNumber,
      });
    newOrder = inserted;
  } catch (err: any) {
    // If shop does not exist or database foreign key fails
    if (err?.code === "23503" || err?.message?.includes("foreign key")) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }
    // If idempotency collision occurred during race condition, fetch and return the existing order
    const raceExisting = await db
      .select({ id: orders.id, token: orders.token, orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.idempotencyKey, data.idempotencyKey))
      .limit(1);

    if (raceExisting.length) {
      return NextResponse.json({
        orderId: raceExisting[0].id,
        token: raceExisting[0].token,
        orderNumber: raceExisting[0].orderNumber,
        isExisting: true,
      });
    }

    throw err;
  }

  // Non-blocking background audit logging
  audit({
    shopId: data.shopId,
    orderId: newOrder.id,
    action: "order.created",
    ipAddress: ip,
    details: { customerName: data.customerName, token: newOrder.token },
  }).catch(() => {});

  return NextResponse.json({
    orderId: newOrder.id,
    token: newOrder.token,
    orderNumber: newOrder.orderNumber,
  });
}
