import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function UploadRootPage() {
  try {
    const shopRows = await db
      .select({ slug: shops.slug })
      .from(shops)
      .where(eq(shops.isActive, true))
      .limit(1);

    if (shopRows.length && shopRows[0].slug) {
      redirect(`/upload/${shopRows[0].slug}`);
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      throw err;
    }
    console.error("UploadRootPage error:", err);
  }

  // Fallback to default slug
  redirect("/upload/godiyal-general-store");
}
