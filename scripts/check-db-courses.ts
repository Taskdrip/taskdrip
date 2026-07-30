import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db.execute(sql`SELECT id, title, category, status, is_published, tags FROM courses ORDER BY title`);
  console.log("ROWS:", JSON.stringify(rows.rows, null, 2));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
