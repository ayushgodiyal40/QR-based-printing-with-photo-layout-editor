import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;

  const shopRows = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shopRows.length) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  return NextResponse.json({ shop: shopRows[0] });
}

const UpdateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  gstNumber: z.string().max(20).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;
  const role = (session.user as any).role;
  if (role !== "owner") return NextResponse.json({ error: "Only owners can update shop settings." }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateShopSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });

  const [updated] = await db
    .update(shops)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(shops.id, shopId))
    .returning();

  await audit({
    shopId,
    userId: session.user.id,
    action: "settings.changed",
    details: parsed.data,
  });

  return NextResponse.json({ shop: updated });
}
