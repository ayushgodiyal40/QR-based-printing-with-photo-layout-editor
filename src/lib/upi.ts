/**
 * Helper to build strict, universally compatible NPCI UPI URI strings
 * that work seamlessly across Google Pay, PhonePe, Paytm, BHIM, and Cred.
 */
export function buildUpiUri(params: {
  upiId: string;
  payeeName?: string | null;
  amount?: string | number | null;
  orderToken?: string | null;
}): string {
  const pa = (params.upiId || "").trim();
  if (!pa) return "";

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

  return `upi://pay?${searchParams.toString()}`;
}
