import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function getCleanConnectionString(raw?: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Remove channel_binding parameter which can cause TLS handshakes to fail in Node pg
  clean = clean.replace(/([?&])channel_binding=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
  return clean;
}

const connectionString = getCleanConnectionString(process.env.DATABASE_URL);
const isNeon = connectionString.includes("neon.tech");

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: connectionString || undefined,
    ssl: isNeon || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;

