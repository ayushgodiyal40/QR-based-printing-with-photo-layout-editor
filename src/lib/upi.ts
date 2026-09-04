/**
 * Standard NPCI UPI URI Specification & Helpers
 * Supports standard dynamic UPI payment intents (upi://pay),
 * on-screen dynamic QR generation, and preserves signed physical
 * PhonePe Soundbox standee QRs without modifying cryptographic signatures.
 */

export interface UpiParams {
  upiId: string;
  payeeName?: string | null;
  amount?: string | number | null;
  orderToken?: string | null;
}

export const DEFAULT_PAYEE_NAME = "Godiyal General Store";

/**
 * Format and validate the exact transaction amount strictly to 2 decimal places (e.g. 1.00, 37.00).
 * Prevents invalid numbers, zero, NaN, or floating point overflows.
 */
export function formatUpiAmount(amount?: string | number | null): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).trim());
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;
  return num.toFixed(2);
}

/**
 * Extract clean VPA handle (e.g. Q865308672@ybl) from raw string or full standee URI.
 */
export function extractUpiVpa(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("upi://pay") || trimmed.includes("pa=")) {
    try {
      const parsed = new URL(
        trimmed.startsWith("upi://") ? trimmed.replace("upi://pay", "http://pay") : `http://pay?${trimmed}`
      );
      return parsed.searchParams.get("pa") || trimmed;
    } catch {
      const match = trimmed.match(/[?&]pa=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : trimmed;
    }
  }
  return trimmed;
}

/**
 * Sanitize payee name: letters, numbers and spaces only, max 30 chars.
 * Defaults to "Godiyal General Store".
 */
export function sanitizePayeeName(name?: string | null): string {
  const candidate = (name || "").trim() || DEFAULT_PAYEE_NAME;
  const cleaned = candidate.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 30).trim();
  return cleaned || DEFAULT_PAYEE_NAME;
}

/**
 * Sanitize transaction note / order reference (alphanumeric only to avoid bank risk filters).
 */
export function sanitizeOrderNote(token?: string | null): string {
  if (!token) return "Order";
  const cleaned = token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  return cleaned ? `Order${cleaned}` : "Order";
}

/**
 * Build Standard NPCI UPI URI for dynamic order payments.
 * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 * Strictly uses safe URL encoding via URLSearchParams.
 */
export function buildStandardUpiUri(params: UpiParams): string {
  const pa = extractUpiVpa(params.upiId);
  if (!pa) return "";

  const pn = sanitizePayeeName(params.payeeName);
  const am = formatUpiAmount(params.amount);
  const tn = sanitizeOrderNote(params.orderToken);

  const searchParams = new URLSearchParams();
  searchParams.set("pa", pa);
  searchParams.set("pn", pn);
  if (am) {
    searchParams.set("am", am);
  }
  searchParams.set("cu", "INR");
  if (tn) {
    searchParams.set("tn", tn);
  }

  return `upi://pay?${searchParams.toString()}`;
}

/**
 * Alias for backward compatibility
 */
export const buildUpiUri = buildStandardUpiUri;

/**
 * Build dynamic on-screen QR URI.
 * Uses the exact standard dynamic URI with amount and order token.
 */
export function buildQrUri(params: UpiParams): string {
  return buildStandardUpiUri(params);
}

/**
 * Check if the shop's configured upiId is an authentic signed standee QR.
 * Returns the exact unchanged standee URI if present, or null.
 * CRITICAL: Never appends am, tn, or modifies mode=02 / sign=... on this URI.
 */
export function getStaticStandeeUri(rawUpiId?: string | null): string | null {
  if (!rawUpiId) return null;
  const trimmed = rawUpiId.trim();
  if (trimmed.startsWith("upi://pay?") && (trimmed.includes("sign=") || trimmed.includes("mode=02"))) {
    return trimmed;
  }
  return null;
}

/**
 * Diagnostics and testing helper for the safe ₹1 test / debug mode.
 * Returns complete encoded and decoded URI breakdown without exposing sensitive data.
 */
export function getUpiDiagnostics(params: UpiParams) {
  const pa = extractUpiVpa(params.upiId);
  const pn = sanitizePayeeName(params.payeeName);
  const am = formatUpiAmount(params.amount);
  const tn = sanitizeOrderNote(params.orderToken);
  const encodedUri = buildStandardUpiUri(params);
  const staticStandeeUri = getStaticStandeeUri(params.upiId);

  return {
    orderToken: params.orderToken || "—",
    amount: am || "0.00",
    merchantVpa: pa,
    payeeName: pn,
    currency: "INR",
    transactionNote: tn,
    encodedUri,
    decodedUri: decodeURIComponent(encodedUri),
    launchScheme: "upi://pay",
    hasStaticStandee: !!staticStandeeUri,
    staticStandeeUri,
  };
}
