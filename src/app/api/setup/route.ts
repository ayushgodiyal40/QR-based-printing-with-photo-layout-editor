import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shops, users, pricingRules } from "@/lib/db/schema";
import { generateSlug } from "@/lib/tokens";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import bcrypt from "bcryptjs";
import { ilike } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

    // Find or create shop
    let shopRows = await db
      .select()
      .from(shops)
      .where(ilike(shops.name, shopName.trim()))
      .limit(1);

    let shop = shopRows[0];

    if (!shop) {
      let slug = generateSlug(shopName);
      // Ensure unique slug
      const slugCheck = await db
        .select({ id: shops.id })
        .from(shops)
        .where(ilike(shops.slug, slug))
        .limit(1);

      if (slugCheck.length > 0) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const [newShop] = await db
        .insert(shops)
        .values({ name: shopName.trim(), slug, isActive: true })
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

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.email, cleanEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists: update user to belong to this shop as owner
      await db
        .update(users)
        .set({
          shopId: shop.id,
          name: adminName.trim(),
          role: "owner",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(ilike(users.email, cleanEmail));
    } else {
      // User does not exist: create user with owner privileges
      const passwordHash = adminPassword
        ? await bcrypt.hash(adminPassword, 12)
        : await bcrypt.hash(crypto.randomUUID(), 10);

      await db.insert(users).values({
        shopId: shop.id,
        email: cleanEmail,
        passwordHash,
        name: adminName.trim(),
        role: "owner",
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      shopId: shop.id,
      slug: shop.slug,
      uploadUrl: `/upload/${shop.slug}`,
    });
  } catch (err: any) {
    console.error("[Setup] Error:", err);

    return NextResponse.json(
      { error: "Setup failed: " + (err?.message || "Internal error"), detail: err?.message },
      { status: 500 }
    );
  }
}
