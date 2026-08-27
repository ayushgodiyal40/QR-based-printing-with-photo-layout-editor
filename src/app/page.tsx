import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/admin/dashboard");
  }

  // Check if setup is needed
  const existingShops = await db.select({ id: shops.id }).from(shops).limit(1);
  if (!existingShops.length) {
    redirect("/setup");
  }

  redirect("/admin");
}
