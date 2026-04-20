import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "Database connection URL is missing. On Railway, add a PostgreSQL service, then add DATABASE_URL to your app service variables using the Postgres service connection URL.",
  );
}

const { Pool } = pg;
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);
const usesSsl =
  process.env.PGSSL === "true" ||
  process.env.DATABASE_PUBLIC_URL === connectionString ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes("neon.tech");

export const pool = new Pool({
  connectionString,
  ssl: usesSsl && !isLocalDatabase ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle({ client: pool, schema });