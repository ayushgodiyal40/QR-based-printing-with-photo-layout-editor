import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const isNeon = process.env.DATABASE_URL?.includes("neon.tech");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isNeon || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
