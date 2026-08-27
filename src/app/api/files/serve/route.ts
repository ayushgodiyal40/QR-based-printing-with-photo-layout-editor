import { NextRequest, NextResponse } from "next/server";
import { verifySignedToken } from "@/lib/signed-url";
import { db } from "@/lib/db";
import { orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile, fileExists } from "@/lib/storage";

/**
 * Public file serve endpoint — requires valid signed token.
 * Used for previewing files in both admin and customer-facing screens.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new NextResponse("Missing token", { status: 400 });

  const verified = verifySignedToken(token);
  if (!verified) return new NextResponse("Invalid or expired token", { status: 403 });

  const { fileId, orderId } = verified;

  const fileRows = await db
    .select()
    .from(orderFiles)
    .where(and(eq(orderFiles.id, fileId), eq(orderFiles.orderId, orderId), eq(orderFiles.isDeleted, false)))
    .limit(1);

  if (!fileRows.length) return new NextResponse("File not found", { status: 404 });

  const file = fileRows[0];

  if (!fileExists(file.storagePath)) {
    return new NextResponse("File not found on disk", { status: 404 });
  }

  const buffer = await readFile(file.storagePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": file.sizeBytes.toString(),
      "Cache-Control": "private, max-age=900",
    },
  });
}
