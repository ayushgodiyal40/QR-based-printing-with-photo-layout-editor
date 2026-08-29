import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: any | undefined;
};

function getCleanConnectionString(raw?: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip unsupported query parameters if present
  clean = clean.replace(/([?&])channel_binding=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
  return clean;
}

const connectionString = getCleanConnectionString(process.env.DATABASE_URL);

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: connectionString || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = globalForDb.db ?? drizzle(pool, { schema });
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type DB = typeof db;


