import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getCleanConnectionString(raw?: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip unsupported query parameters if present
  clean = clean.replace(/([?&])channel_binding=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
  return clean;
}

const connectionString = getCleanConnectionString(process.env.DATABASE_URL);

// Neon HTTP driver: uses native HTTP fetch (zero socket timeouts, zero connection pooling issues on Vercel)
const sql = neon(
  connectionString ||
    "postgresql://neondb_owner:npg_3klbnsyTg5Vw@ep-long-feather-az6sl6vx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb"
);

export const db = drizzle(sql, { schema });
export type DB = typeof db;



