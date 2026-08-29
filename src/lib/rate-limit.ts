import { NextRequest } from "next/server";

// Simple in-memory rate limiter
const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number; // time window in ms
  max: number;      // max requests per window
}

export function rateLimit(options: RateLimitOptions) {
  return function check(identifier: string): { success: boolean; remaining: number } {
    // In development or local testing, never block requests
    if (process.env.NODE_ENV !== "production" || identifier === "127.0.0.1" || identifier === "::1" || identifier === "unknown") {
      return { success: true, remaining: 9999 };
    }

    const now = Date.now();
    const existing = store.get(identifier);

    if (!existing || now > existing.resetAt) {
      store.set(identifier, { count: 1, resetAt: now + options.windowMs });
      return { success: true, remaining: options.max - 1 };
    }

    if (existing.count >= options.max) {
      return { success: false, remaining: 0 };
    }

    existing.count++;
    return { success: true, remaining: options.max - existing.count };
  };
}

// Pre-configured generous limiters for print shops
export const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 1000 }); // 1000 files/hr
export const orderLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 200 });    // 200 orders/hr
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 25 });     // 25/15min

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
