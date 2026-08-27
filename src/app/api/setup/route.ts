import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shops, users, pricingRules } from "@/lib/db/schema";
import { generateSlug } from "@/lib/tokens";
import { DEFAULT_PRICING } from "@/lib/pricing";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SetupSchema = z.object({
  shopName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    // Only allow setup if no shops exist yet
    const existing = await db.select({ id: shops.id }).from(shops).limit(1);
    if (existing.length) {
      return NextResponse.json(
        { error: "Shop already configured. Setup is disabled." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = SetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shopName, adminEmail, adminPassword, adminName } = parsed.data;

    // Create shop
    const slug = generateSlug(shopName);
    const [shop] = await db
      .insert(shops)
      .values({ name: shopName, slug })
      .returning();

    // Create owner user
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db
      .insert(users)
      .values({
        shopId: shop.id,
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: "owner",
      })
      .returning();

    // Seed default pricing
    await db.insert(pricingRules).values(
      DEFAULT_PRICING.map((p) => ({
        shopId: shop.id,
        paperSize: p.paperSize as any,
        colorMode: p.colorMode as any,
        sides: p.sides as any,
        pricePerPage: p.pricePerPage,
      }))
    );

    return NextResponse.json({
      success: true,
      shopId: shop.id,
      slug: shop.slug,
      uploadUrl: `/upload/${shop.slug}`,
    });
  } catch (err: any) {
    console.error("[Setup] Error:", err);

    // Check specifically for missing DATABASE_URL / connection error
    const message: string = err?.message || "";
    if (
      message.includes("DATABASE_URL") ||
      message.includes("ECONNREFUSED") ||
      message.includes("connect") ||
      message.includes("password authentication") ||
      message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("SSL")
    ) {
      return NextResponse.json(
        {
          error:
            "Database connection failed. Please set DATABASE_URL in your .env.local file and run: npm run db:push",
          detail: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Setup failed. Please check the server logs.", detail: message },
      { status: 500 }
    );
  }
}
