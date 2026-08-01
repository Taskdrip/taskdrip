/**
 * apply-migrations.mjs
 *
 * Non-interactive migration runner. Applies all SQL migration files in order,
 * skipping statements that reference already-existing objects (idempotent re-runs).
 * Exits with code 1 on any unexpected error so CI / startup scripts can detect failure.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs
 *
 * DB connection mirrors server/db.ts — honours DATABASE_URL,
 * DATABASE_PRIVATE_URL, DATABASE_PUBLIC_URL, POSTGRES_URL, or
 * individual PG* environment variables (PGHOST / PGPORT / PGUSER /
 * PGPASSWORD / PGDATABASE).
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Client } = pg;

// ── Resolve connection string the same way server/db.ts does ─────────────────

function isValidPgUrl(url) {
  try {
    const p = new URL(url);
    return p.protocol === 'postgresql:' || p.protocol === 'postgres:';
  } catch {
    return false;
  }
}

function resolveConnectionString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
  ];
  for (const url of candidates) {
    if (url && isValidPgUrl(url)) return url;
    if (url) console.warn(`[migrate] Ignoring malformed DB URL (${url.slice(0, 30)}…)`);
  }

  const { PGHOST, PGPORT = '5432', PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgresql://${PGUSER}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }

  return undefined;
}

// ── "Already exists" PG error codes ──────────────────────────────────────────

const ALREADY_EXISTS_CODES = new Set([
  '42P07', // duplicate_table
  '42P16', // invalid_table_definition (e.g. duplicate column via ADD COLUMN)
  '42710', // duplicate_object
  '42701', // duplicate_column
  '23505', // unique_violation (duplicate index names on some PG versions)
]);

function isAlreadyExists(err) {
  return (
    ALREADY_EXISTS_CODES.has(err.code) ||
    /already exists/i.test(err.message)
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const connectionString = resolveConnectionString();
if (!connectionString) {
  console.error(
    '[migrate] ERROR: No database connection found. ' +
    'Set DATABASE_URL (or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE).'
  );
  process.exit(1);
}

const migrationsDir = join(process.cwd(), 'migrations');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()               // alphabetical = numeric order for 0000_, 0001_, …
  .map(f => join(migrationsDir, f));

const client = new Client({ connectionString });
await client.connect();

let applied = 0, skipped = 0, errors = 0;

for (const file of files) {
  const sql = readFileSync(file, 'utf8');

  // Split on Drizzle's statement-breakpoint markers; fall back to double-newline
  const statements = sql
    .split(/-->[ \t]*statement-breakpoint/)
    .flatMap(chunk => chunk.split(/;\s*\n/))
    .map(s => s.replace(/^--[^\n]*\n/gm, '').trim())  // strip line comments
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.query(stmt.endsWith(';') ? stmt : stmt + ';');
      applied++;
    } catch (err) {
      if (isAlreadyExists(err)) {
        skipped++;
      } else {
        console.error(`[migrate] ERROR in ${file}:\n  ${err.message.slice(0, 200)}`);
        errors++;
      }
    }
  }
}

await client.end();

console.log(
  `[migrate] Done — applied: ${applied}, skipped (already exist): ${skipped}, errors: ${errors}`
);

if (errors > 0) {
  console.error(`[migrate] ${errors} unexpected error(s) — see above. Schema may be partially applied.`);
  process.exit(1);
}
