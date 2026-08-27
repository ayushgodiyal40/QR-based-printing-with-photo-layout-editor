import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_BASE = process.env.UPLOAD_DIR || "./uploads";

export interface StoredFile {
  storagePath: string;
  storedName: string;
}

/**
 * Ensure directory exists.
 */
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Store an uploaded file buffer to disk.
 * Returns the relative storage path and stored filename.
 */
export async function storeFile(
  buffer: Buffer,
  originalName: string,
  shopId: string,
  orderId: string
): Promise<StoredFile> {
  const ext = path.extname(originalName).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;
  const dir = path.join(UPLOAD_BASE, shopId, orderId);
  ensureDir(dir);
  const fullPath = path.join(dir, storedName);
  await fs.promises.writeFile(fullPath, buffer);
  // Store relative path from UPLOAD_BASE
  const storagePath = path.join(shopId, orderId, storedName);
  return { storagePath, storedName };
}

/**
 * Read a stored file as a Buffer.
 */
export async function readFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_BASE, storagePath);
  return fs.promises.readFile(fullPath);
}

/**
 * Delete a stored file from disk.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_BASE, storagePath);
    await fs.promises.unlink(fullPath);
  } catch {
    // File may already be deleted, ignore
  }
}

/**
 * Delete an entire order directory.
 */
export async function deleteOrderDirectory(
  shopId: string,
  orderId: string
): Promise<void> {
  try {
    const dir = path.join(UPLOAD_BASE, shopId, orderId);
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

/**
 * Get the absolute full path for streaming.
 */
export function getAbsolutePath(storagePath: string): string {
  return path.resolve(path.join(UPLOAD_BASE, storagePath));
}

/**
 * Check if a file exists.
 */
export function fileExists(storagePath: string): boolean {
  const fullPath = path.join(UPLOAD_BASE, storagePath);
  return fs.existsSync(fullPath);
}
