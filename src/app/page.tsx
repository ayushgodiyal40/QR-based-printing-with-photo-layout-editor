import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  let target = "/admin";

  try {
    const existingShops = await db.select({ id: shops.id }).from(shops).limit(1);
    if (!existingShops || existingShops.length === 0) {
      target = "/setup";
    }
  } catch (err) {
    console.error("Home determination error:", err);
    target = "/admin";
  }

  redirect(target);
}
