import { db } from "../server/db";
import { blogPosts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const fixes = [
    { slug: "future-creator-economy-web3", img: "/uploads/blog/future-creator-economy-web3.png" },
    { slug: "passive-income-digital-products", img: "/uploads/blog/passive-income-digital-products.png" },
  ];
  for (const f of fixes) {
    const r = await db.update(blogPosts).set({ featuredImage: f.img }).where(eq(blogPosts.slug, f.slug)).returning({ id: blogPosts.id });
    console.log(`fixed ${f.slug} → ${f.img}  (rows=${r.length})`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
