import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const shopId = (session.user as any).shopId as string;
    const role = (session.user as any).role;

    if (role !== "owner") {
      return NextResponse.json(
        { error: "Only shop owners can delete the account." },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const idToken = body?.idToken as string | undefined;

    // 1. Permanently delete Firebase user account if idToken is provided
    const apiKey =
      process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (apiKey && idToken) {
      try {
        const firebaseDeleteRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey.trim()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: idToken.trim() }),
          }
        );

        if (!firebaseDeleteRes.ok) {
          const errData = await firebaseDeleteRes.json().catch(() => ({}));
          console.warn("Firebase accounts:delete response:", firebaseDeleteRes.status, errData);
        }
      } catch (fbErr) {
        console.error("Firebase deletion call error:", fbErr);
      }
    }

    // 2. Delete shop and all cascading records (users, orders, files, settings, printers, pricing rules)
    if (shopId) {
      await db.delete(shops).where(eq(shops.id, shopId));
    }

    // 3. Ensure the user record is deleted if not already removed by cascade
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }

    // 4. Return success response and clear session cookies
    const response = NextResponse.json({
      success: true,
      message: "Account, print shop, and all associated records deleted permanently.",
    });

    const sessionCookieNames = [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.csrf-token",
      "__Host-authjs.csrf-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ];

    for (const cookieName of sessionCookieNames) {
      response.cookies.set(cookieName, "", {
        maxAge: 0,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
