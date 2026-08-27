import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { printers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;
  const list = await db.select().from(printers).where(eq(printers.shopId, shopId));
  return NextResponse.json({ printers: list });
}

const PrinterSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  supportsColor: z.boolean().default(false),
  supportsDuplex: z.boolean().default(false),
  connectionType: z.string().default("network"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;

  const body = await req.json();
  const parsed = PrinterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });

  const [p] = await db.insert(printers).values({ shopId, ...parsed.data }).returning();
  return NextResponse.json({ printer: p });
}
