import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);
const usesSsl =
  process.env.PGSSL === "true" ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes("neon.tech");

export const pool = new Pool({
  connectionString,
  ssl: usesSsl && !isLocalDatabase ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle({ client: pool, schema });