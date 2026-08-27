import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import UploadClient from "./UploadClient";

export async function generateMetadata({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = await db
    .select({ name: shops.name })
    .from(shops)
    .where(eq(shops.slug, shopId))
    .limit(1);
  return {
    title: shop[0]?.name ? `${shop[0].name} — Send Files for Printing` : "Send Files for Printing",
    description: "Upload your PDFs and photos to the print shop instantly.",
  };
}

export default async function UploadPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shopRows = await db
    .select({ id: shops.id, name: shops.name, slug: shops.slug })
    .from(shops)
    .where(eq(shops.slug, shopId))
    .limit(1);

  if (!shopRows.length) notFound();

  return <UploadClient shop={shopRows[0]} />;
}
