/**
 * Comprehensive demo seed:
 *  - 3 demo users (Tremendouslymax, Breedskooldigital, Breedskoolgalaxy) with $15K + 2.5M followers + 50 following
 *  - $700,000 platform earnings (verified escrow on completed/closed campaigns)
 *  - Realistic completed campaigns (admin-created)
 *  - Realistic shop products
 *  - Realistic P2P listings
 *  - Inline images in all 12 blog articles
 */
import bcrypt from "bcrypt";
import { db } from "../server/db";
import {
  users,
  campaigns,
  escrowPayments,
  shopProducts,
  p2pListings,
  blogPosts,
  brandWallets,
  transactions,
} from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const ADMIN_ID = "admin_1777111541737_k4d5o8g42";

// ─── Demo user accounts ─────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: "Tremendouslymax@gmail.com",
    firstName: "Tremendous",
    lastName: "Max",
    username: "tremendousmax",
    userType: "creator",
    niche: "Crypto",
    bio: "Top crypto creator turning Web3 into wealth. Follow for daily alpha and brand collabs.",
    followers: 2_500_000,
    following: 50,
    availableBalance: "15000.00",
    totalEarned: "47200.00",
    creatorTier: "Global Titan",
  },
  {
    email: "Breedskooldigital@gmail.com",
    firstName: "Breedskool",
    lastName: "Digital",
    username: "breedskooldigital",
    userType: "creator",
    niche: "Education",
    bio: "Edutainment for the next generation of digital creators. Tutorials, drops, and big payouts.",
    followers: 2_500_000,
    following: 50,
    availableBalance: "15000.00",
    totalEarned: "39800.00",
    creatorTier: "Global Titan",
  },
  {
    email: "Breedskoolgalaxy@gmail.com",
    firstName: "Breedskool",
    lastName: "Galaxy",
    username: "breedskoolgalaxy",
    userType: "creator",
    niche: "Lifestyle",
    bio: "Lifestyle creator across the Breedskool universe. Premium brand collabs and viral launches.",
    followers: 2_500_000,
    following: 50,
    availableBalance: "15000.00",
    totalEarned: "32600.00",
    creatorTier: "Global Titan",
  },
];

// ─── Realistic completed campaigns (totaling $700K platform revenue) ───────
// Platform earnings = sum of verified escrow_payments. We will create campaigns whose
// escrow amounts add up to exactly $700,000.
const DEMO_CAMPAIGNS = [
  { title: "Solana Wave x TikTok Sprint", brand: "Solana Wave", category: "Crypto", platform: "tiktok", reward: "180", slots: 250, escrow: 80000, image: "/uploads/blog/top-crypto-trends-2026.png" },
  { title: "BlockGuru Course — YouTube Long-Form", brand: "BlockGuru Academy", category: "Education", platform: "youtube", reward: "320", slots: 200, escrow: 95000, image: "/uploads/blog/build-monetize-saas-2026.png" },
  { title: "PixelArt NFT Drop — Twitter Threads", brand: "PixelArt Studio", category: "NFT", platform: "twitter", reward: "75", slots: 600, escrow: 65000, image: "/uploads/blog/ai-blockchain-revolution-2026.png" },
  { title: "DeFiPro Yield Vaults — IG Reels", brand: "DeFiPro Labs", category: "DeFi", platform: "instagram", reward: "150", slots: 300, escrow: 70000, image: "/uploads/blog/defi-passive-income-beginner-guide.png" },
  { title: "PlayChain P2E Launch — Stream Day", brand: "PlayChain", category: "Gaming", platform: "twitch", reward: "240", slots: 180, escrow: 60000, image: "/uploads/blog/play-to-earn-gaming-2026.png" },
  { title: "RWA Index Token Awareness Sprint", brand: "Tangible Finance", category: "RWA", platform: "youtube", reward: "400", slots: 150, escrow: 85000, image: "/uploads/blog/rwa-tokenization-real-world-assets.png" },
  { title: "VaultGuard Security Drive", brand: "VaultGuard", category: "Security", platform: "twitter", reward: "120", slots: 350, escrow: 55000, image: "/uploads/blog/crypto-web3-security-guide.png" },
  { title: "Taskdrip x SocialFi Spotlight Week", brand: "Taskdrip", category: "SocialFi", platform: "tiktok", reward: "200", slots: 400, escrow: 90000, image: "/uploads/blog/socialfi-taskdrip-creator-economy.png" },
  { title: "AI Tools Mega Bundle — Demo Reels", brand: "Promptly AI", category: "AI", platform: "instagram", reward: "180", slots: 250, escrow: 65000, image: "/uploads/blog/ai-blockchain-revolution-2026.png" },
  { title: "Galaxy Creator Fund — Lifestyle Series", brand: "Galaxy Studios", category: "Lifestyle", platform: "youtube", reward: "260", slots: 220, escrow: 60000, image: "/uploads/blog/future-creator-economy-web3.png" },
  { title: "DropEarn Passive Income Webinars", brand: "DropEarn", category: "Passive Income", platform: "youtube", reward: "150", slots: 200, escrow: 35000, image: "/uploads/blog/passive-income-digital-products.png" },
  // total escrow above sums to 760k — adjust last to land on 700k exact: -60k
  // Actually let me recompute: 80+95+65+70+60+85+55+90+65+60+35 = 760
  // To hit exactly 700k, drop last "DropEarn" to 0 (skip), then we need 700k from first 10: 80+95+65+70+60+85+55+90+65+60 = 725
  // Drop second-last to 35: 80+95+65+70+60+85+55+90+65+35 = 700. 
];

// Build the final 10-campaign list summing exactly $700,000
const FINAL_CAMPAIGNS = [
  { title: "Solana Wave x TikTok Sprint", brand: "Solana Wave", category: "Crypto", platform: "tiktok", reward: "180", slots: 250, escrow: 80000, image: "/uploads/blog/top-crypto-trends-2026.png" },
  { title: "BlockGuru Course — YouTube Long-Form", brand: "BlockGuru Academy", category: "Education", platform: "youtube", reward: "320", slots: 200, escrow: 95000, image: "/uploads/blog/build-monetize-saas-2026.png" },
  { title: "PixelArt NFT Drop — Twitter Threads", brand: "PixelArt Studio", category: "NFT", platform: "twitter", reward: "75", slots: 600, escrow: 65000, image: "/uploads/blog/ai-blockchain-revolution-2026.png" },
  { title: "DeFiPro Yield Vaults — IG Reels", brand: "DeFiPro Labs", category: "DeFi", platform: "instagram", reward: "150", slots: 300, escrow: 70000, image: "/uploads/blog/defi-passive-income-beginner-guide.png" },
  { title: "PlayChain P2E Launch — Stream Day", brand: "PlayChain", category: "Gaming", platform: "twitch", reward: "240", slots: 180, escrow: 60000, image: "/uploads/blog/play-to-earn-gaming-2026.png" },
  { title: "RWA Index Token Awareness Sprint", brand: "Tangible Finance", category: "RWA", platform: "youtube", reward: "400", slots: 150, escrow: 85000, image: "/uploads/blog/rwa-tokenization-real-world-assets.png" },
  { title: "VaultGuard Security Drive", brand: "VaultGuard", category: "Security", platform: "twitter", reward: "120", slots: 350, escrow: 55000, image: "/uploads/blog/crypto-web3-security-guide.png" },
  { title: "Taskdrip x SocialFi Spotlight Week", brand: "Taskdrip", category: "SocialFi", platform: "tiktok", reward: "200", slots: 400, escrow: 90000, image: "/uploads/blog/socialfi-taskdrip-creator-economy.png" },
  { title: "AI Tools Mega Bundle — Demo Reels", brand: "Promptly AI", category: "AI", platform: "instagram", reward: "180", slots: 250, escrow: 65000, image: "/uploads/blog/ai-blockchain-revolution-2026.png" },
  { title: "Galaxy Creator Fund — Lifestyle Series", brand: "Galaxy Studios", category: "Lifestyle", platform: "youtube", reward: "260", slots: 220, escrow: 35000, image: "/uploads/blog/future-creator-economy-web3.png" },
];

// ─── Realistic shop products ────────────────────────────────────────────────
const DEMO_PRODUCTS = [
  {
    title: "Web3 Creator Toolkit (50 Notion Templates)",
    description: "Complete creator dashboard, content planner, brand pitch tracker, revenue report and 47 more Notion templates engineered for Web3 creators. Plug-and-play.",
    shortDescription: "50 plug-and-play Notion templates for serious Web3 creators",
    price: "49.00",
    originalPrice: "129.00",
    category: "Templates",
    type: "digital",
    featuredImage: "/uploads/blog/future-creator-economy-web3.png",
    isFeatured: true,
    rating: "4.9",
    reviewCount: 312,
    salesCount: 2487,
    tags: ["templates", "notion", "creator", "web3"],
  },
  {
    title: "DeFi Yield Tracker Spreadsheet",
    description: "Track every farm, lending position and stablecoin yield across 14 chains in one auto-refreshing Google Sheet. Built by an audited DeFi analyst.",
    shortDescription: "Track every DeFi position in one auto-refreshing sheet",
    price: "29.00",
    category: "Tools",
    type: "digital",
    featuredImage: "/uploads/blog/defi-passive-income-beginner-guide.png",
    rating: "4.8",
    reviewCount: 187,
    salesCount: 940,
    tags: ["defi", "spreadsheet", "yield"],
  },
  {
    title: "Brand Pitch Deck Pack — 12 Conversion-Tested Decks",
    description: "12 pixel-perfect Figma pitch decks proven to land $5K+ brand deals. Includes case-study slide, rate card, and audience snapshot.",
    shortDescription: "12 Figma decks proven to win $5K+ brand collabs",
    price: "39.00",
    originalPrice: "99.00",
    category: "Templates",
    type: "digital",
    featuredImage: "/uploads/blog/socialfi-taskdrip-creator-economy.png",
    isFeatured: true,
    rating: "4.9",
    reviewCount: 256,
    salesCount: 1820,
    tags: ["pitch-deck", "figma", "brand-deals"],
  },
  {
    title: "Smart Contract Security Audit Guide (PDF)",
    description: "120-page step-by-step audit playbook used by professional auditors. Covers reentrancy, oracle manipulation, access control, and 30 real-world exploit case studies.",
    shortDescription: "The exact playbook professional auditors use",
    price: "59.00",
    category: "Guides",
    type: "digital",
    featuredImage: "/uploads/blog/crypto-web3-security-guide.png",
    rating: "5.0",
    reviewCount: 144,
    salesCount: 612,
    tags: ["security", "audit", "smart-contracts"],
  },
  {
    title: "Faceless YouTube Crypto Channel Pack",
    description: "Complete pack: 30 video scripts, 200 B-roll clips, intro/outro After Effects file, channel art, and a content calendar. Built for fully faceless growth.",
    shortDescription: "Everything to launch a faceless crypto YouTube channel",
    price: "79.00",
    originalPrice: "199.00",
    category: "Templates",
    type: "digital",
    featuredImage: "/uploads/blog/play-to-earn-gaming-2026.png",
    rating: "4.7",
    reviewCount: 98,
    salesCount: 530,
    tags: ["youtube", "faceless", "crypto"],
  },
  {
    title: "Stablecoin Payroll Setup (Done-For-You)",
    description: "We set up your business to pay teams in USDT/USDC with full bookkeeping, payslips and tax reports. One-time fee, lifetime savings.",
    shortDescription: "We do your stablecoin payroll setup end-to-end",
    price: "299.00",
    category: "Services",
    type: "service",
    featuredImage: "/uploads/blog/make-money-online-2026.png",
    rating: "4.9",
    reviewCount: 41,
    salesCount: 96,
    tags: ["payroll", "stablecoin", "service"],
  },
  {
    title: "Tokenomics Modeler (Excel + Web App)",
    description: "Model token supply, vesting, emissions and circulating-supply curves. Used by 600+ Web3 founders to design healthy token launches.",
    shortDescription: "Plan healthy token launches in minutes",
    price: "89.00",
    category: "Tools",
    type: "digital",
    featuredImage: "/uploads/blog/rwa-tokenization-real-world-assets.png",
    rating: "4.8",
    reviewCount: 75,
    salesCount: 314,
    tags: ["tokenomics", "founder", "launch"],
  },
  {
    title: "Passive Income Bundle: 5 Digital Products to Sell Today",
    description: "Five ready-to-sell digital products with full resale rights — ebooks, templates and prompt packs. Brand them, list them, keep 100% of revenue.",
    shortDescription: "5 ready-to-resell digital products with full rights",
    price: "49.00",
    originalPrice: "149.00",
    category: "Bundles",
    type: "digital",
    featuredImage: "/uploads/blog/passive-income-digital-products.png",
    isFeatured: true,
    rating: "4.7",
    reviewCount: 220,
    salesCount: 1456,
    tags: ["passive-income", "resale-rights", "bundle"],
  },
];

// ─── P2P listings ───────────────────────────────────────────────────────────
const DEMO_P2P = [
  {
    title: "USDT (TRC-20) — Fast Bank Transfer (NGN)",
    listingType: "crypto",
    productSubtype: "sell",
    description: "Selling USDT on Tron. Instant Naira bank transfer after confirmation. 8+ years on chain, 1000+ trades.",
    price: "1485.00", currency: "NGN", cryptoAsset: "USDT", paymentMethod: "Bank Transfer", country: "Nigeria",
    minOrder: "50", maxOrder: "5000",
    featuredImage: "/uploads/blog/top-crypto-trends-2026.png",
    status: "approved",
  },
  {
    title: "USDC (BSC) — Buy with PayPal Friends & Family",
    listingType: "crypto",
    productSubtype: "buy",
    description: "Buying USDC with PayPal F&F. 0% fee. Trusted vendor.",
    price: "1.02", currency: "USD", cryptoAsset: "USDC", paymentMethod: "PayPal", country: "United States",
    minOrder: "20", maxOrder: "2000",
    featuredImage: "/uploads/blog/make-money-online-2026.png",
    status: "approved",
  },
  {
    title: "Logo Design — 24h Turnaround",
    listingType: "service",
    productSubtype: "service",
    description: "Premium logo design with 3 concepts and unlimited revisions. 24h delivery. 8-year graphic designer.",
    price: "75.00", currency: "USD", paymentMethod: "Crypto / PayPal", country: "Global",
    featuredImage: "/uploads/blog/socialfi-taskdrip-creator-economy.png",
    status: "approved",
  },
  {
    title: "Telegram Channel Boosting — 1k Premium Members",
    listingType: "service",
    productSubtype: "service",
    description: "1,000 active Telegram members delivered in 48h. Crypto/Web3 niche. Real engagement, no bots.",
    price: "120.00", currency: "USD", paymentMethod: "USDT", country: "Global",
    featuredImage: "/uploads/blog/future-creator-economy-web3.png",
    status: "approved",
  },
  {
    title: "Vintage Solana NFT — Rare 1/1 Art Drop",
    listingType: "digital",
    productSubtype: "sell",
    description: "Hand-painted 1/1 vintage Solana NFT. Listed below floor for fast sale. Includes royalty rights.",
    price: "850.00", currency: "USDC", paymentMethod: "Crypto", country: "Global",
    featuredImage: "/uploads/blog/ai-blockchain-revolution-2026.png",
    status: "approved",
  },
  {
    title: "MacBook Pro M4 14\" 16GB / 512GB — Brand New, Sealed",
    listingType: "physical",
    productSubtype: "sell",
    description: "Brand new sealed MacBook Pro M4. Ships worldwide via DHL. Pay with USDT or bank transfer.",
    price: "1850.00", currency: "USD", paymentMethod: "USDT / Bank", country: "United States",
    shippingInfo: "DHL Express, 2–4 business days worldwide",
    featuredImage: "/uploads/blog/build-monetize-saas-2026.png",
    status: "approved",
  },
  {
    title: "Influencer Shout-out — 500K Crypto Audience",
    listingType: "service",
    productSubtype: "service",
    description: "Single shout-out post to 500K-strong crypto audience on Twitter + IG. Engagement guaranteed.",
    price: "350.00", currency: "USDT", paymentMethod: "USDT", country: "Global",
    featuredImage: "/uploads/blog/top-crypto-trends-2026.png",
    status: "approved",
  },
  {
    title: "Web3 Course Mentorship — 1-on-1 (4 weeks)",
    listingType: "service",
    productSubtype: "service",
    description: "Personalized 4-week Web3 mentorship. Covers DeFi, smart contracts, tokenomics. Weekly Zoom calls.",
    price: "499.00", currency: "USD", paymentMethod: "USDT / PayPal", country: "Global",
    featuredImage: "/uploads/blog/build-monetize-saas-2026.png",
    status: "approved",
  },
];

async function main() {
  console.log("\n=== Comprehensive demo seed starting ===\n");

  // ─── 1. Demo users ──────────────────────────────────────────────────────
  console.log("→ Creating demo users…");
  const userIdMap: Record<string, string> = {};
  const passwordHash = await bcrypt.hash("DemoPass!2026", 10);
  for (const u of DEMO_USERS) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${u.email})`)
      .limit(1);
    let id: string;
    if (existing.length > 0) {
      id = existing[0].id;
      await db
        .update(users)
        .set({
          followers: u.followers,
          following: u.following,
          totalFollowers: u.followers,
          availableBalance: u.availableBalance,
          totalEarned: u.totalEarned,
          creatorTier: u.creatorTier,
          niche: u.niche,
          username: u.username,
          bio: u.bio,
          isVerified: true,
        } as any)
        .where(eq(users.id, id));
      console.log(`  UPDATED user: ${u.email}  (followers=${u.followers.toLocaleString()}, balance=$${u.availableBalance})`);
    } else {
      id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await db.insert(users).values({
        id,
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        userType: u.userType,
        niche: u.niche,
        bio: u.bio,
        followers: u.followers,
        following: u.following,
        totalFollowers: u.followers,
        availableBalance: u.availableBalance,
        totalEarned: u.totalEarned,
        creatorTier: u.creatorTier,
        isVerified: true,
        instagramFollowers: Math.round(u.followers * 0.45),
        twitterFollowers: Math.round(u.followers * 0.25),
        tiktokFollowers: Math.round(u.followers * 0.20),
        youtubeFollowers: Math.round(u.followers * 0.10),
      } as any);
      console.log(`  CREATED user: ${u.email}  (id=${id}, followers=${u.followers.toLocaleString()}, balance=$${u.availableBalance})`);
    }
    userIdMap[u.email] = id;
  }

  // ─── 2. Completed campaigns + verified escrow → $700K platform earnings ─
  console.log("\n→ Creating completed campaigns + $700K verified escrow…");
  let totalEscrow = 0;
  for (const c of FINAL_CAMPAIGNS) {
    const exists = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(sql`${campaigns.title} = ${c.title}`)
      .limit(1);
    if (exists.length > 0) {
      console.log(`  SKIP campaign (exists): ${c.title}`);
      continue;
    }
    const cid = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.insert(campaigns).values({
      id: cid,
      title: c.title,
      description: `${c.brand} partnered with Taskdrip creators for the ${c.title} campaign. Closed and fully paid out.`,
      category: c.category,
      platform: c.platform,
      brandName: c.brand,
      brandId: ADMIN_ID,
      reward: c.reward,
      totalBudget: c.escrow.toFixed(2),
      budgetPerCreator: c.reward,
      featureImage: c.image,
      totalSlots: c.slots,
      filledSlots: c.slots, // fully filled / completed
      estimatedTime: "2-3 days",
      requirements: ["Active social account", "Compliance with brand guidelines"],
      status: "completed",
      paymentStatus: "verified",
      depositRequired: true,
      isActive: false,
      isFeatured: false,
    } as any);
    // Verified escrow payment for this campaign
    const eid = `esc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.insert(escrowPayments).values({
      id: eid,
      campaignId: cid,
      brandId: ADMIN_ID,
      amount: c.escrow.toFixed(2),
      status: "verified",
      network: "USDT (TRC-20)",
      transactionHash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
      submittedAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000),
      verifiedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      verifiedBy: ADMIN_ID,
    } as any);
    totalEscrow += c.escrow;
    console.log(`  CREATED campaign: ${c.title}  (escrow=$${c.escrow.toLocaleString()})`);
  }
  console.log(`  → Total verified escrow added: $${totalEscrow.toLocaleString()}`);

  // ─── 3. Realistic shop products ─────────────────────────────────────────
  console.log("\n→ Creating shop products…");
  for (const p of DEMO_PRODUCTS) {
    const exists = await db
      .select({ id: shopProducts.id })
      .from(shopProducts)
      .where(sql`${shopProducts.title} = ${p.title}`)
      .limit(1);
    if (exists.length > 0) {
      console.log(`  SKIP product (exists): ${p.title}`);
      continue;
    }
    await db.insert(shopProducts).values({
      title: p.title,
      description: p.description,
      shortDescription: p.shortDescription,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      category: p.category,
      type: p.type,
      featuredImage: p.featuredImage,
      isFeatured: p.isFeatured ?? false,
      isActive: true,
      tags: p.tags,
      rating: p.rating,
      reviewCount: p.reviewCount,
      salesCount: p.salesCount,
      createdBy: ADMIN_ID,
    } as any);
    console.log(`  CREATED product: ${p.title}`);
  }

  // ─── 4. P2P listings ────────────────────────────────────────────────────
  console.log("\n→ Creating P2P listings…");
  for (const p of DEMO_P2P) {
    const exists = await db
      .select({ id: p2pListings.id })
      .from(p2pListings)
      .where(sql`${p2pListings.title} = ${p.title}`)
      .limit(1);
    if (exists.length > 0) {
      console.log(`  SKIP p2p (exists): ${p.title}`);
      continue;
    }
    await db.insert(p2pListings).values({
      sellerId: ADMIN_ID,
      title: p.title,
      listingType: p.listingType,
      productSubtype: p.productSubtype,
      description: p.description,
      price: p.price,
      currency: p.currency,
      cryptoAsset: (p as any).cryptoAsset || null,
      paymentMethod: p.paymentMethod,
      country: p.country,
      minOrder: (p as any).minOrder || null,
      maxOrder: (p as any).maxOrder || null,
      shippingInfo: (p as any).shippingInfo || null,
      featuredImage: p.featuredImage,
      status: p.status,
      approvedBy: ADMIN_ID,
      approvedAt: new Date(),
    } as any);
    console.log(`  CREATED p2p: ${p.title}`);
  }

  // ─── 5. Inline images in blog articles ──────────────────────────────────
  console.log("\n→ Embedding inline images into blog articles…");
  const allBlogs = await db.select().from(blogPosts);
  const SEED_SLUGS = new Set([
    "future-of-web3-2026",
    "make-money-online-2026",
    "defi-passive-income-beginner-guide",
    "play-to-earn-gaming-2026",
    "ai-blockchain-revolution-2026",
    "rwa-tokenization-real-world-assets",
    "build-monetize-saas-2026",
    "crypto-web3-security-guide",
    "top-crypto-trends-2026",
    "socialfi-taskdrip-creator-economy",
    "passive-income-digital-products",
    "future-creator-economy-web3",
  ]);
  for (const post of allBlogs as any[]) {
    if (!SEED_SLUGS.has(post.slug)) continue;
    if (!post.featuredImage) continue;
    if (post.content?.includes(post.featuredImage)) {
      console.log(`  SKIP already-embedded: ${post.slug}`);
      continue;
    }
    // Insert the featured image as a hero image after the first paragraph,
    // and a second pull-quote-style image after the second </h2> for variety.
    const heroImg = `<figure class="my-6"><img src="${post.featuredImage}" alt="${post.title}" class="w-full rounded-xl shadow-lg" loading="lazy" /><figcaption class="text-sm text-gray-500 mt-2 text-center italic">${post.title}</figcaption></figure>`;
    let updated = post.content as string;
    // After first </p>
    const firstPClose = updated.indexOf("</p>");
    if (firstPClose > -1) {
      updated = updated.slice(0, firstPClose + 4) + "\n" + heroImg + "\n" + updated.slice(firstPClose + 4);
    } else {
      updated = heroImg + "\n" + updated;
    }
    // Second image deeper in body — after 2nd </h2>
    let count = 0; let pos = 0; let secondH2 = -1;
    while (true) {
      pos = updated.indexOf("</h2>", pos);
      if (pos === -1) break;
      count++;
      if (count === 2) { secondH2 = pos + 5; break; }
      pos += 5;
    }
    if (secondH2 > -1) {
      const inlineImg = `<figure class="my-5"><img src="${post.featuredImage}" alt="${post.title} — illustration" class="w-full rounded-lg" loading="lazy" /></figure>`;
      updated = updated.slice(0, secondH2) + "\n" + inlineImg + "\n" + updated.slice(secondH2);
    }
    await db.update(blogPosts).set({ content: updated, updatedAt: new Date() }).where(eq(blogPosts.id, post.id));
    console.log(`  EMBEDDED images in: ${post.slug}`);
  }

  console.log("\n=== Done. Summary ===");
  console.log(`  Demo users: ${DEMO_USERS.length}`);
  console.log(`  Verified escrow added: $${totalEscrow.toLocaleString()}`);
  console.log(`  Shop products created: ${DEMO_PRODUCTS.length} (where new)`);
  console.log(`  P2P listings created: ${DEMO_P2P.length} (where new)`);
  console.log(`  Blog articles updated with inline images: ${SEED_SLUGS.size}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
