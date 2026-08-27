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

/**
 * Calculate the estimated price for a print job based on shop pricing rules.
 */
export async function calculatePrice(
  shopId: string,
  job: PrintJob
): Promise<number> {
  const rules = await db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.shopId, shopId),
        eq(pricingRules.colorMode, job.colorMode),
        eq(pricingRules.paperSize, job.paperSize as any),
        eq(pricingRules.sides, job.sides)
      )
    )
    .limit(1);

  if (!rules.length) return 0;

  const pricePerPage = parseFloat(rules[0].pricePerPage as string);
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
