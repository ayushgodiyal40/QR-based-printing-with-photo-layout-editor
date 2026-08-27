import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

function getUploadBase(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "uploads");
  }
  return process.env.UPLOAD_DIR || "./uploads";
}

export interface StoredFile {
  storagePath: string;
  storedName: string;
  base64Data: string;
}

/**
 * Ensure directory exists without throwing read-only error.
 */
function ensureDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    // Ignore if read-only or tmp dir creation issue
  }
}

/**
 * Store an uploaded file buffer.
 * Saves to local/tmp disk AND returns base64 for DB persistence (Vercel compatible).
 */
export async function storeFile(
  buffer: Buffer,
  originalName: string,
  shopId: string,
  orderId: string
): Promise<StoredFile> {
  const ext = path.extname(originalName).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;
  const uploadBase = getUploadBase();
  const dir = path.join(uploadBase, shopId, orderId);
  ensureDir(dir);
  const fullPath = path.join(dir, storedName);

  try {
    await fs.promises.writeFile(fullPath, buffer);
  } catch {
    // Ignore local write failure on serverless
  }

  const storagePath = path.join(shopId, orderId, storedName);
  const base64Data = buffer.toString("base64");

  return { storagePath, storedName, base64Data };
}

/**
 * Read a stored file as a Buffer (from disk or DB fallback).
 */
export async function readFile(storagePath: string, dbBase64Data?: string | null): Promise<Buffer> {
  if (dbBase64Data) {
    return Buffer.from(dbBase64Data, "base64");
  }

  const uploadBase = getUploadBase();
  const fullPath = path.join(uploadBase, storagePath);

  try {
    return await fs.promises.readFile(fullPath);
  } catch {
    // Fallback if local disk file missing
    return Buffer.from("");
  }
}

/**
 * Delete a stored file.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const uploadBase = getUploadBase();
    const fullPath = path.join(uploadBase, storagePath);
    await fs.promises.unlink(fullPath);
  } catch {
    // Ignore
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
    const uploadBase = getUploadBase();
    const dir = path.join(uploadBase, shopId, orderId);
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

/**
 * Check if file exists.
 */
export function fileExists(storagePath: string): boolean {
  const uploadBase = getUploadBase();
  const fullPath = path.join(uploadBase, storagePath);
  return fs.existsSync(fullPath);
}
