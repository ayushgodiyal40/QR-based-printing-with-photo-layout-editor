import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "fallback-dev-secret";

/**
 * Generate a HMAC-SHA256 signed URL token for file access.
 * Token expires after ttlSeconds.
 */
export function generateSignedToken(
  fileId: string,
  orderId: string,
  ttlSeconds = 900 // 15 minutes
): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}:${orderId}:${expires}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${sig}`).toString("base64url");
  return token;
}

/**
 * Verify a signed token. Returns { fileId, orderId } or null if invalid/expired.
 */
export function verifySignedToken(
  token: string
): { fileId: string; orderId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [fileId, orderId, expiresStr, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (Math.floor(Date.now() / 1000) > expires) return null;
    const payload = `${fileId}:${orderId}:${expires}`;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex")))
      return null;
    return { fileId, orderId };
  } catch {
    return null;
  }
}
