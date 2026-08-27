import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile, getAbsolutePath, fileExists } from "@/lib/storage";
import { generateSignedToken } from "@/lib/signed-url";
import { audit } from "@/lib/audit";

/**
 * GET /api/admin/orders/[id]/files/[fileId]?action=url|download
 * Returns a signed URL or streams the file directly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = (session.user as any).shopId as string;
  const { id, fileId } = await params;

  // Verify order belongs to this shop
  const orderRows = await db
    .select({ id: orders.id, shopId: orders.shopId })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.shopId, shopId)))
    .limit(1);

  if (!orderRows.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Get file record
  const fileRows = await db
    .select()
    .from(orderFiles)
    .where(and(eq(orderFiles.id, fileId), eq(orderFiles.orderId, id), eq(orderFiles.isDeleted, false)))
    .limit(1);

  if (!fileRows.length) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const file = fileRows[0];
  const action = req.nextUrl.searchParams.get("action") || "url";

  if (action === "url") {
    // Return a signed token for the file serve endpoint
    const token = generateSignedToken(file.id, id);
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/files/serve?token=${token}`;
    return NextResponse.json({ url, fileName: file.originalName, mimeType: file.mimeType });
  }

  // Stream the file directly
  if (!fileExists(file.storagePath)) {
    return NextResponse.json({ error: "File not found on disk." }, { status: 404 });
  }

  await audit({
    shopId,
    orderId: id,
    userId: session.user.id,
    action: "file.downloaded",
    details: { fileName: file.originalName },
  });

  const fileBuffer = await readFile(file.storagePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.sizeBytes.toString(),
    },
  });
}
