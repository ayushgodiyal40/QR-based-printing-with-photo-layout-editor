import { db } from "./db";
import { pricingRules } from "./db/schema";
import { eq, and } from "drizzle-orm";

export interface PrintJob {
  pages: number;
  colorMode: "bw" | "color";
  paperSize: "A4" | "A3" | "Letter" | "Legal";
  copies: number;
  sides: "single" | "double";
}

const pricingCache = new Map<string, { rules: any[]; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidatePricingCache(shopId?: string) {
  if (shopId) {
    pricingCache.delete(shopId);
  } else {
    pricingCache.clear();
  }
}

/**
 * Calculate the estimated price for a print job based on shop pricing rules.
 * Uses high-performance in-memory cache to avoid redundant database roundtrips.
 */
export async function calculatePrice(
  shopId: string,
  job: PrintJob
): Promise<number> {
  const now = Date.now();
  const cached = pricingCache.get(shopId);
  let allShopRules: any[];

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    allShopRules = cached.rules;
  } else {
    allShopRules = await db
      .select()
      .from(pricingRules)
      .where(eq(pricingRules.shopId, shopId));
    pricingCache.set(shopId, { rules: allShopRules, cachedAt: now });
  }

  const rule = allShopRules.find(
    (r) =>
      r.colorMode === job.colorMode &&
      r.paperSize === job.paperSize &&
      r.sides === job.sides
  );

  if (!rule) return 0;

  const pricePerPage = parseFloat(rule.pricePerPage as string);
  // For double-sided, each sheet covers 2 pages but count per page
  const sheets =
    job.sides === "double" ? Math.ceil(job.pages / 2) : job.pages;
  return Math.round(pricePerPage * sheets * job.copies * 100) / 100;
}

/**
 * Calculate price without DB lookup (using provided price per page).
 */
export function calculatePriceSync(
  pricePerPage: number,
  pages: number,
  copies: number,
  sides: "single" | "double"
): number {
  const sheets = sides === "double" ? Math.ceil(pages / 2) : pages;
  return Math.round(pricePerPage * sheets * copies * 100) / 100;
}

/**
 * Default pricing rules for seeding.
 */
export const DEFAULT_PRICING = [
  { paperSize: "A4", colorMode: "bw", sides: "single", pricePerPage: "1.00" },
  { paperSize: "A4", colorMode: "bw", sides: "double", pricePerPage: "1.00" },
  { paperSize: "A4", colorMode: "color", sides: "single", pricePerPage: "5.00" },
  { paperSize: "A4", colorMode: "color", sides: "double", pricePerPage: "5.00" },
  { paperSize: "A3", colorMode: "bw", sides: "single", pricePerPage: "2.00" },
  { paperSize: "A3", colorMode: "color", sides: "single", pricePerPage: "10.00" },
  { paperSize: "Letter", colorMode: "bw", sides: "single", pricePerPage: "1.00" },
  { paperSize: "Letter", colorMode: "color", sides: "single", pricePerPage: "5.00" },
  { paperSize: "Legal", colorMode: "bw", sides: "single", pricePerPage: "1.50" },
  { paperSize: "Legal", colorMode: "color", sides: "single", pricePerPage: "6.00" },
];
