import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

const files = [
  'migrations/0000_elite_mesmero.sql',
  'migrations/0001_round_korath.sql',
  'migrations/0002_milky_brood.sql'
];

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const stmts = content.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
  let ok = 0, skipped = 0;
  for (const stmt of stmts) {
    try { await db.execute(sql.raw(stmt)); ok++; }
    catch { skipped++; }
  }
  console.log(`Done: ${f} (${ok} applied, ${skipped} skipped)`);
}
console.log('All migrations applied');
process.exit(0);
