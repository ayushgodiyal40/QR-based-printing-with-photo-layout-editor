import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { storeFile } from "@/lib/storage";
import { getPdfPageCount, getImageDimensions, isAllowedFile } from "@/lib/file-processor";
import { calculatePrice } from "@/lib/pricing";
import { uploadLimiter, getIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { notifyShop } from "@/lib/sse";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || "50") * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIp(req);
  const limiter = uploadLimiter(ip);
  if (!limiter.success) {
    return NextResponse.json({ error: "Upload limit exceeded. Try again later." }, { status: 429 });
  }

  const { id: orderId } = await params;

  // Verify order exists and is in acceptable state
  const orderRows = await db
    .select({
      id: orders.id,
      shopId: orders.shopId,
      status: orders.status,
      expiresAt: orders.expiresAt,
      colorMode: orders.colorMode,
      paperSize: orders.paperSize,
      copies: orders.copies,
      sides: orders.sides,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!orderRows.length) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const order = orderRows[0];

  if (order.expiresAt && new Date() > order.expiresAt) {
    return NextResponse.json({ error: "Order has expired." }, { status: 410 });
  }

  if (!["received", "uploading", "waiting"].includes(order.status)) {
    return NextResponse.json({ error: "Order cannot accept files in its current state." }, { status: 409 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File is too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 50} MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate file type
  const validation = isAllowedFile(file.name, buffer);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 415 });
  }

  // Determine file metadata
  let pageCount: number | null = null;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;

  const mimeType = file.type || "application/octet-stream";

  if (mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    pageCount = await getPdfPageCount(buffer);
  } else if (mimeType.startsWith("image/")) {
    const dims = await getImageDimensions(buffer);
    if (dims) {
      imageWidth = dims.width;
      imageHeight = dims.height;
    }
    pageCount = 1; // Each image = 1 page
  }

  // Store the file
  const { storagePath, storedName, base64Data } = await storeFile(
    buffer,
    file.name,
    order.shopId,
    orderId
  );

  // Insert file record
  const [savedFile] = await db
    .insert(orderFiles)
    .values({
      orderId,
      originalName: file.name,
      storedName,
      mimeType,
      sizeBytes: file.size,
      pageCount,
      imageWidth,
      imageHeight,
      storagePath,
      fileData: base64Data,
      uploadStatus: "complete",
    })
    .returning();

  // Update order totals and recalculate price
  const allFiles = await db
    .select({ pageCount: orderFiles.pageCount })
    .from(orderFiles)
    .where(and(eq(orderFiles.orderId, orderId), eq(orderFiles.isDeleted, false)));

  const totalFiles = allFiles.length;
  const totalPages = allFiles.reduce((sum, f) => sum + (f.pageCount || 1), 0);

  const price = await calculatePrice(order.shopId, {
    pages: totalPages,
    colorMode: order.colorMode,
    paperSize: order.paperSize,
    copies: order.copies,
    sides: order.sides,
  });

  const estimatedPriceStr = price.toString();

  await db
    .update(orders)
    .set({ totalFiles, totalPages, estimatedPrice: estimatedPriceStr, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await audit({
    shopId: order.shopId,
    orderId,
    action: "file.uploaded",
    ipAddress: ip,
    details: { fileName: file.name, sizeBytes: file.size, pageCount },
  });

  // Notify dashboard of file upload & price update
  notifyShop(order.shopId, {
    event: "order_updated",
    data: { orderId, totalFiles, totalPages, estimatedPrice: estimatedPriceStr },
  });

  return NextResponse.json({
    fileId: savedFile.id,
    originalName: savedFile.originalName,
    sizeBytes: savedFile.sizeBytes,
    pageCount: savedFile.pageCount,
    mimeType: savedFile.mimeType,
    imageWidth: savedFile.imageWidth,
    imageHeight: savedFile.imageHeight,
    totalFiles,
    totalPages,
    estimatedPrice: estimatedPriceStr,
  });
}
