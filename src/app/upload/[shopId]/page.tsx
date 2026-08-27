import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import UploadClient from "./UploadClient";
import { Printer, AlertCircle } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  try {
    const shop = await db
      .select({ name: shops.name })
      .from(shops)
      .where(eq(shops.slug, shopId))
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
  
  let shopRows: any[] = [];
  try {
    shopRows = await db
      .select({ id: shops.id, name: shops.name, slug: shops.slug })
      .from(shops)
      .where(eq(shops.slug, shopId))
      .limit(1);
  } catch {
    // DB query issue or table missing
  }

  if (!shopRows.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Shop Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            No print shop exists with the URL code <span className="text-indigo-300 font-mono font-semibold">"{shopId}"</span>.
          </p>
          <div className="bg-slate-700/50 rounded-2xl p-4 text-left text-xs text-slate-300 space-y-2 mb-6 border border-slate-600">
            <p className="font-semibold text-slate-200">How to resolve:</p>
            <p>1. Check if you completed the setup wizard at <code className="text-indigo-300">/setup</code> on this domain.</p>
            <p>2. Log into your Admin panel at <code className="text-indigo-300">/admin/settings</code> to get your exact shop URL and QR code.</p>
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
