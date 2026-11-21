import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateQrDataUrl, generateQrBuffer } from "@/lib/qr";
import { getAppUrl } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shopId = (session.user as any).shopId as string;

  const { searchParams } = new URL(req.url);
  const isPng = searchParams.get("format") === "png";

  const shopRows = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shopRows.length) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const shop = shopRows[0];
  const baseUrl = getAppUrl(req);
  const uploadUrl = `${baseUrl}/upload/${shop.slug}`;

  if (isPng) {
    const png = await generateQrBuffer(uploadUrl);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="printshop-qr.png"',
      },
    });
  }

  const qrDataUrl = await generateQrDataUrl(uploadUrl);
  return NextResponse.json({ uploadUrl, qrDataUrl, shop });
}
