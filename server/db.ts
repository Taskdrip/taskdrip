import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Validate that a string is a parseable postgresql:// or postgres:// URL.
function isValidPgUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "postgresql:" || parsed.protocol === "postgres:";
  } catch {
    return false;
  }
}

// Build connection string — support URL-based OR PG* env var style (Railway sets both).
// Always validate URL strings before using them so a malformed DATABASE_URL doesn't
// crash the pool while valid PG* individual variables are present.
function resolveConnectionString(): string | undefined {
  // 1. Direct URL env vars — validate each before trusting it
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
  ];
  for (const url of candidates) {
    if (url) {
      if (isValidPgUrl(url)) return url;
      console.warn(`[db] Ignoring malformed database URL (${url.slice(0, 30)}…) — falling back to PG* vars`);
    }
  }

  // 2. Construct from individual PG* vars (Railway Postgres plugin sets these)
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || "5432";
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  if (host && user && password && database) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  return undefined;
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  // Log a clear warning but don't throw — let the server start so health checks pass.
  // API endpoints that touch the DB will fail gracefully at query time.
  console.error(
    "[db] WARNING: No database connection URL found. " +
    "Set DATABASE_URL (or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) to enable database features."
  );
}

const isLocalDatabase = connectionString
  ? /localhost|127\.0\.0\.1|\.internal/.test(connectionString)
  : false;

const usesSsl = connectionString
  ? (
    process.env.PGSSL === "true" ||
    process.env.DATABASE_PUBLIC_URL === connectionString ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("railway.app") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("rds.amazonaws.com")
  )
  : false;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: usesSsl && !isLocalDatabase ? { rejectUnauthorized: false } : undefined,
        // Sensible pool limits for Railway (1 replica)
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        // Dummy pool — queries will fail but the server will start
        host: "127.0.0.1",
        port: 54321,
        connectionTimeoutMillis: 1000,
      }
);

export const db = drizzle({ client: pool, schema });
