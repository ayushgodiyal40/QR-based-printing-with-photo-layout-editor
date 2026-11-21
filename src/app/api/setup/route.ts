import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shops, users, pricingRules } from "@/lib/db/schema";
import { generateSlug } from "@/lib/tokens";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import bcrypt from "bcryptjs";
import { ilike } from "drizzle-orm";
import { z } from "zod";

const SetupSchema = z.object({
  shopName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).optional(),
  adminName: z.string().min(1).max(100),
  idToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shopName, adminEmail, adminPassword, adminName, idToken } = parsed.data;

    // If idToken is provided, verify it
    if (idToken) {
      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified || !verified.email) {
        return NextResponse.json(
          { error: "Google verification failed. Please try signing in again." },
          { status: 401 }
        );
      }
    } else if (!adminPassword || adminPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = adminEmail.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.email, cleanEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in directly on the admin login page." },
        { status: 409 }
      );
    }

    // Find or create shop
    const existingShops = await db.select().from(shops).limit(1);
    let shop = existingShops[0];

    if (!shop) {
      const slug = generateSlug(shopName);
      const [newShop] = await db
        .insert(shops)
        .values({ name: shopName.trim(), slug })
        .returning();
      shop = newShop;

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
    }

    // Create user with owner privileges
    const passwordHash = adminPassword
      ? await bcrypt.hash(adminPassword, 12)
      : await bcrypt.hash(crypto.randomUUID(), 10);

    await db
      .insert(users)
      .values({
        shopId: shop.id,
        email: cleanEmail,
        passwordHash,
        name: adminName.trim(),
        role: "owner",
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      shopId: shop.id,
      slug: shop.slug,
      uploadUrl: `/upload/${shop.slug}`,
    });
  } catch (err: any) {
    console.error("[Setup] Error:", err);

    const message: string = err?.message || "";
    if (
      message.includes("DATABASE_URL") ||
      message.includes("ECONNREFUSED") ||
      message.includes("connect") ||
      message.includes("SSL")
    ) {
      return NextResponse.json(
        {
          error: "Database connection failed. Please check your DATABASE_URL configuration.",
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
