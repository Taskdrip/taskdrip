import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Fix demo courses that were seeded with status=draft but isPublished=true
  const result = await db.execute(sql`
    UPDATE courses
    SET status = 'published'
    WHERE is_published = true AND status = 'draft'
    RETURNING id, title, category, status
  `);
  console.log(`Updated ${result.rows.length} courses to published:`);
  (result.rows as any[]).forEach(r => console.log(' -', r.title, '->', r.status));

  // Add breedskool tag to demo courses that are missing it
  await db.execute(sql`
    UPDATE courses
    SET tags = CASE
      WHEN title = 'Instagram Growth Masterclass' THEN ARRAY['breedskool_instagram', 'instagram', 'social media', 'breedskool']
      WHEN title = 'TikTok Virality Formula'      THEN ARRAY['breedskool_tiktok', 'tiktok', 'short form video', 'breedskool']
      WHEN title = 'YouTube Channel to $10K/Month' THEN ARRAY['breedskool_youtube', 'youtube', 'monetization', 'breedskool']
      WHEN title = 'Crypto Monetization for Influencers' THEN ARRAY['breedskool_crypto', 'crypto', 'web3', 'monetization', 'breedskool']
      WHEN title LIKE '%VibeCoding%' OR title LIKE '%SaaS Web Apps with Vibe%' THEN ARRAY['breedskool_vibecoding', 'saas', 'vibecoding', 'no-code', 'breedskool']
      ELSE tags
    END
    WHERE tags IS NULL OR NOT ('breedskool' = ANY(tags))
  `);
  console.log('Tags updated for demo courses.');

  // Verify final state
  const all = await db.execute(sql`SELECT title, category, status, is_published, tags FROM courses ORDER BY title`);
  console.log('\nFinal course state:');
  (all.rows as any[]).forEach((r: any) => console.log(r.status, r.category, r.title.slice(0,40)));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
