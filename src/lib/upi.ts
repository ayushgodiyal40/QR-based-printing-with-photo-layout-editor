/**
 * Helper to build strict, universally compatible NPCI UPI URI strings
 * and direct mobile app deep links for PhonePe, Google Pay, and Paytm.
 * Supports both standard VPAs and verified signed Merchant Standee QRs (Soundbox).
 */

export interface UpiParams {
  upiId: string;
  payeeName?: string | null;
  amount?: string | number | null;
  orderToken?: string | null;
}

/** Extract clean VPA handle (e.g., Q865308672@ybl or shop@okaxis) from raw string or full UPI URI */
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

function appendParamsToSignedUri(
  baseUri: string,
  amount?: string | number | null,
  orderToken?: string | null
): string {
  const parsedAmount = parseFloat(String(amount || "0"));
  const am = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : "";
  const rawToken = (orderToken || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  const tn = rawToken ? `Order ${rawToken}` : "";

  let result = baseUri.trim();
  if (am && !result.includes("am=")) {
    result += (result.includes("?") ? "&" : "?") + `am=${am}&cu=INR`;
  }
  if (tn && !result.includes("tn=")) {
    result += `&tn=${encodeURIComponent(tn)}`;
  }
  return result;
}

function getQueryString(params: UpiParams): string {
  const raw = (params.upiId || "").trim();
  if (!raw) return "";

  // If already a full signed UPI URI (e.g. from a PhonePe Soundbox standee with digital signature)
  if (raw.startsWith("upi://pay?") || raw.includes("sign=")) {
    const full = appendParamsToSignedUri(raw, params.amount, params.orderToken);
    return full.startsWith("upi://pay?") ? full.substring("upi://pay?".length) : full;
  }

  const pa = raw;
  const rawName = (params.payeeName || "Print Shop").trim();
  // Safe payee name: alphanumeric and spaces only, max 30 chars
  const pn = rawName.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 30) || "Print Shop";

  // Clean numeric amount
  const parsedAmount = parseFloat(String(params.amount || "0"));
  const am = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : "";

  // Transaction note
  const rawToken = (params.orderToken || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  const tn = rawToken ? `Order ${rawToken}` : "Print Order";

  const searchParams = new URLSearchParams();
  searchParams.set("pa", pa);
  searchParams.set("pn", pn);
  if (am) {
    searchParams.set("am", am);
  }
  searchParams.set("cu", "INR");
  searchParams.set("tn", tn);

  return searchParams.toString();
}

/** Standard NPCI UPI URI (shows app picker or opens default UPI app) */
export function buildUpiUri(params: UpiParams): string {
  const raw = (params.upiId || "").trim();
  if (raw.startsWith("upi://pay?")) {
    return appendParamsToSignedUri(raw, params.amount, params.orderToken);
  }
  const qs = getQueryString(params);
  return qs ? `upi://pay?${qs}` : "";
}

/** Direct PhonePe app deep link (opens PhonePe directly) */
export function buildPhonePeUri(params: UpiParams): string {
  const raw = (params.upiId || "").trim();
  if (raw.startsWith("upi://pay?")) {
    const full = appendParamsToSignedUri(raw, params.amount, params.orderToken);
    return full.replace(/^upi:\/\/pay\?/, "phonepe://pay?");
  }
  const qs = getQueryString(params);
  return qs ? `phonepe://pay?${qs}` : "";
}

/** Direct Google Pay (Tez) app deep link (opens GPay directly) */
export function buildGPayUri(params: UpiParams): string {
  const raw = (params.upiId || "").trim();
  if (raw.startsWith("upi://pay?")) {
    const full = appendParamsToSignedUri(raw, params.amount, params.orderToken);
    return full.replace(/^upi:\/\/pay\?/, "tez://upi/pay?");
  }
  const qs = getQueryString(params);
  return qs ? `tez://upi/pay?${qs}` : "";
}

/** Direct Paytm app deep link (opens Paytm directly) */
export function buildPaytmUri(params: UpiParams): string {
  const raw = (params.upiId || "").trim();
  if (raw.startsWith("upi://pay?")) {
    const full = appendParamsToSignedUri(raw, params.amount, params.orderToken);
    return full.replace(/^upi:\/\/pay\?/, "paytmmp://pay?");
  }
  const qs = getQueryString(params);
  return qs ? `paytmmp://pay?${qs}` : "";
}

