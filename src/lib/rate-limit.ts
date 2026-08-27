import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (use Redis in production for multi-instance)
const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number; // time window in ms
  max: number;      // max requests per window
}

export function rateLimit(options: RateLimitOptions) {
  return function check(identifier: string): { success: boolean; remaining: number } {
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

// Pre-configured limiters
export const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 }); // 30/hr
export const orderLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });  // 10/hr
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });   // 5/15min

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
