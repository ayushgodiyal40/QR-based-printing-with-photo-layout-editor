import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateToken, generateOrderNumber } from "@/lib/tokens";
import { orderLimiter, getIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { notifyShop } from "@/lib/sse";
import { z } from "zod";

const CreateOrderSchema = z.object({
  shopId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(128),
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

  // Verify shop exists
  const shop = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.id, data.shopId))
    .limit(1);

  if (!shop.length) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  // Idempotency check
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

  // Generate token and order number
  const token = generateToken();
  const orderNumber = generateOrderNumber(token);

  // Set expiry (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [newOrder] = await db
    .insert(orders)
    .values({
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
      status: "received",
    })
    .returning();

  await audit({
    shopId: data.shopId,
    orderId: newOrder.id,
    action: "order.created",
    ipAddress: ip,
    details: { customerName: data.customerName, token },
  });

  // Notify admin dashboard via SSE
  notifyShop(data.shopId, {
    event: "new_order",
    data: {
      orderId: newOrder.id,
      token,
      orderNumber,
      customerName: data.customerName || "Walk-in",
      status: "received",
      createdAt: newOrder.createdAt,
    },
  });

  return NextResponse.json({
    orderId: newOrder.id,
    token,
    orderNumber,
  });
}
