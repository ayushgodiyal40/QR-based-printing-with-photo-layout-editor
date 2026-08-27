import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;

  const rules = await db.select().from(pricingRules).where(eq(pricingRules.shopId, shopId));
  return NextResponse.json({ rules });
}

const PricingRuleSchema = z.object({
  paperSize: z.enum(["A4", "A3", "Letter", "Legal"]),
  colorMode: z.enum(["bw", "color"]),
  sides: z.enum(["single", "double"]),
  pricePerPage: z.number().min(0).max(9999),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;
  const role = (session.user as any).role;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only shop owners can change pricing." }, { status: 403 });
  }

  const body = await req.json();
  const rules = z.array(PricingRuleSchema).safeParse(body.rules);
  if (!rules.success) return NextResponse.json({ error: "Invalid pricing data." }, { status: 400 });

  // Delete existing rules and re-insert
  await db.delete(pricingRules).where(eq(pricingRules.shopId, shopId));

  if (rules.data.length > 0) {
    await db.insert(pricingRules).values(
      rules.data.map((r) => ({
        shopId,
        paperSize: r.paperSize as any,
        colorMode: r.colorMode as any,
        sides: r.sides as any,
        pricePerPage: r.pricePerPage.toString(),
      }))
    );
  }

  await audit({
    shopId,
    userId: session.user.id,
    action: "pricing.changed",
    details: { rulesCount: rules.data.length },
  });

  return NextResponse.json({ success: true });
}
