import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import UploadClient from "./UploadClient";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  try {
    const cleanId = decodeURIComponent(shopId || "");
    const shop = await db
      .select({ name: shops.name })
      .from(shops)
      .where(or(eq(shops.slug, cleanId), eq(shops.id, cleanId), ilike(shops.slug, cleanId)))
      .limit(1);
    return {
      title: shop[0]?.name ? `${shop[0].name} — Send Files for Printing` : "Send Files for Printing",
      description: "Upload your PDFs and photos to the print shop instantly.",
    };
  } catch {
    return { title: "Send Files for Printing" };
  }
}

export default async function UploadPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const cleanId = decodeURIComponent(shopId || "");
  
  let shopRows: any[] = [];
  let dbError: string | null = null;
  try {
    shopRows = await db
      .select({ id: shops.id, name: shops.name, slug: shops.slug })
      .from(shops)
      .where(or(eq(shops.slug, cleanId), eq(shops.id, cleanId), ilike(shops.slug, cleanId)))
      .limit(1);

    // If still not found by exact slug/id, fallback to active shop
    if (!shopRows.length) {
      shopRows = await db
        .select({ id: shops.id, name: shops.name, slug: shops.slug })
        .from(shops)
        .where(eq(shops.isActive, true))
        .limit(1);
    }

    // If still empty, get first available shop
    if (!shopRows.length) {
      shopRows = await db
        .select({ id: shops.id, name: shops.name, slug: shops.slug })
        .from(shops)
        .limit(1);
    }
  } catch (err: any) {
    console.error("UploadPage DB query error:", err);
    dbError = err?.message || String(err);
  }

  if (!shopRows.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Shop Not Found</h1>
          <p className="text-slate-400 text-sm mb-4">
            No print shop is registered in the database yet.
          </p>
          {dbError && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3 text-left text-xs text-red-200 font-mono mb-4 break-all">
              <strong>Database Connection Notice:</strong> {dbError}
            </div>
          )}
          <div className="bg-slate-700/50 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-2 mb-6 border border-slate-600">
            <p className="font-semibold text-slate-200">How to resolve:</p>
            <p>1. Complete the setup wizard at <code className="text-indigo-300">/setup</code>.</p>
            <p>2. Log into your Admin panel at <code className="text-indigo-300">/admin/settings</code> to view and print your QR code.</p>
          </div>
          <Link
            href="/admin"
            className="inline-block w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Go to Admin Login →
          </Link>
        </div>
      </div>
    );
  }

  return <UploadClient shop={shopRows[0]} />;
}
