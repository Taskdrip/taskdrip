import { db } from '../server/db';
import { shopProducts } from '../shared/schema';
import { eq } from 'drizzle-orm';

await db.update(shopProducts)
  .set({
    featuredImage: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&q=80',
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
    ]
  })
  .where(eq(shopProducts.id, 'bb63cf09-6c54-48eb-9ed7-a2d3807e210c'));

console.log('Updated LAWCOLAB images');
process.exit(0);
