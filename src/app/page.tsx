import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const session = await auth();
    if (session?.user) {
      redirect("/admin/dashboard");
    }

    const existingShops = await db.select({ id: shops.id }).from(shops).limit(1);
    if (!existingShops.length) {
      redirect("/setup");
    }
  } catch (err: any) {
    if (
      err?.digest?.startsWith("NEXT_REDIRECT") ||
      err?.message === "NEXT_REDIRECT" ||
      err?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Home redirection error:", err);
  }

  redirect("/admin");
}
