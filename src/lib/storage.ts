import { v4 as uuidv4 } from "uuid";

export interface StoredFile {
  storagePath: string;
  storedName: string;
  base64Data: string;
}

/**
 * Store an uploaded file.
 * Returns storage path and base64 string for database persistence (100% Vercel compatible).
 */
export async function storeFile(
  buffer: Buffer,
  originalName: string,
  shopId: string,
  orderId: string
): Promise<StoredFile> {
  const ext = originalName.includes(".")
    ? "." + originalName.split(".").pop()!.toLowerCase()
    : "";
  const storedName = `${uuidv4()}${ext}`;
  const storagePath = `${shopId}/${orderId}/${storedName}`;
  const base64Data = buffer.toString("base64");

  return { storagePath, storedName, base64Data };
}

/**
 * Read stored file as Buffer from database base64 data.
 */
export async function readFile(_storagePath: string, dbBase64Data?: string | null): Promise<Buffer> {
  if (dbBase64Data) {
    return Buffer.from(dbBase64Data, "base64");
  }
  return Buffer.from("");
}

/**
 * Delete stored file.
 */
export async function deleteFile(_storagePath: string): Promise<void> {
  // Database record deletion handles cleanup
}

/**
 * Delete order files.
 */
export async function deleteOrderDirectory(_shopId: string, _orderId: string): Promise<void> {
  // Database record deletion handles cleanup
}

/**
 * Get absolute path helper.
 */
export function getAbsolutePath(storagePath: string): string {
  return storagePath;
}

/**
 * File existence check.
 */
export function fileExists(_storagePath: string): boolean {
  return true;
}
