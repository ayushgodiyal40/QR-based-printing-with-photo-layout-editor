import { PDFDocument } from "pdf-lib";

/**
 * Extract page count from a PDF buffer.
 * Uses pdf-lib with regex fallback for non-standard/encrypted PDFs so page counting never fails.
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    if (count && count > 0) return count;
  } catch {
    // Ignore pdf-lib parse error, try regex fallback
  }

  // Regex fallback: count /Type /Page occurrences in PDF binary structure
  try {
    const str = buffer.toString("binary");
    const matches = str.match(/\/Type\s*\/Page\b/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  } catch {
    // Ignore regex error
  }

  return 1; // Default fallback: 1 page
}

/**
 * Check if a buffer is a valid PDF by inspecting magic bytes.
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const header = buffer.slice(0, 1024).toString("ascii");
  return header.includes("%PDF");
}

/**
 * Get image dimensions from a buffer using sharp.
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
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

  const header = buffer.slice(0, 1024).toString("ascii");
  if (header.includes("%PDF")) return "application/pdf";

  const bytes = buffer.slice(0, 12);

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

  return null;
}

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
  _buffer: Buffer
): { ok: boolean; reason?: string } {
  const ext = originalName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `File type "${ext}" is not supported.` };
  }

  return { ok: true };
}
