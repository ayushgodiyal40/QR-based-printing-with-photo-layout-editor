import { PDFDocument } from "pdf-lib";

/**
 * Extract page count from a PDF buffer.
 * Returns null if the file is not a valid PDF.
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number | null> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return null;
  }
}

/**
 * Check if a buffer is a valid PDF by checking magic bytes.
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";
}

/**
 * Get image dimensions from a buffer using sharp.
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
    // Dynamic import to avoid issues if sharp isn't available
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate MIME type by magic bytes.
 */
export function validateMimeByMagic(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  const bytes = buffer.slice(0, 12);

  // PDF
  if (bytes.slice(0, 4).toString("ascii") === "%PDF") return "application/pdf";

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";

  // WEBP
  if (
    bytes.slice(0, 4).toString("ascii") === "RIFF" &&
    bytes.slice(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";

  // GIF
  if (bytes.slice(0, 3).toString("ascii") === "GIF") return "image/gif";

  // HEIC/HEIF — skip magic check, allow by extension
  return null;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
]);

export function isAllowedFile(
  originalName: string,
  buffer: Buffer
): { ok: boolean; reason?: string } {
  const ext = originalName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `File type "${ext}" is not supported.` };
  }

  const magic = validateMimeByMagic(buffer);
  if (magic && !ALLOWED_MIME_TYPES.has(magic)) {
    return { ok: false, reason: "File content does not match allowed types." };
  }

  return { ok: true };
}
