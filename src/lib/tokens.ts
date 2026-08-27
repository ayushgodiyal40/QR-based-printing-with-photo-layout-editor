import crypto from "crypto";

// Characters that avoid 0/O, 1/I/l confusion
const SAFE_DIGITS = "23456789";

/**
 * Generate a short 4-digit numeric customer token.
 * Retries to avoid collision within the shop.
 */
export function generateToken(): string {
  let token = "";
  for (let i = 0; i < 4; i++) {
    token += SAFE_DIGITS[Math.floor(Math.random() * SAFE_DIGITS.length)];
  }
  return token;
}

/**
 * Generate a unique order number like PS-4827.
 */
export function generateOrderNumber(token: string): string {
  return `PS-${token}`;
}

/**
 * Generate a cryptographically random UUID for order IDs.
 */
export function generateOrderId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a shop slug from the shop name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
