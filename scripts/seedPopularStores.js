/**
 * Seed Popular Stores Script
 *
 * Seeds ~60 globally popular stores so users can submit community coupons for them
 * even before affiliate deals are in place.
 *
 * Logos are fetched via Logo.dev (official Clearbit replacement):
 *   https://img.logo.dev/{domain}?token=YOUR_TOKEN
 *
 * How to get a free Logo.dev token:
 *   1. Go to https://www.logo.dev
 *   2. Sign up for a free account
 *   3. Copy your public token
 *   4. Add to your .env file:  LOGO_DEV_TOKEN=pk_xxxxxxxxxxxx
 *
 * If LOGO_DEV_TOKEN is not set, logos will be left blank (stores still seed fine).
 *
 * Usage:
 *   node server/scripts/seedPopularStores.js
 *
 * Requirements:
 *   - MONGO_URL (or MONGODB_URI) in your .env
 *   - At least one admin/user must exist in the database
 *   - Run seedCategories.js first so category names resolve correctly
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');

// ---------------------------------------------------------------------------
// Logo URL builder
// ---------------------------------------------------------------------------

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || '';

/**
 * Extracts the bare domain from a full URL and returns a Logo.dev image URL.
 * e.g. 'https://www.uber.com' → 'https://img.logo.dev/uber.com?token=pk_xxx&size=200'
 * If no token is configured, returns empty string.
 */
function logoUrl(storeUrl) {
  if (!LOGO_DEV_TOKEN) return '';
  try {
    const domain = new URL(storeUrl).hostname.replace(/^www\./, '');
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200&format=png`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Store data  (no logo field — generated at insert time from url)
// ---------------------------------------------------------------------------

const STORES = [
  // ── Ride-Hailing & Delivery ──────────────────────────────────────────────
  {
    name: 'Uber',
    category: 'Travel',
    url: 'https://www.uber.com',
    description:
      'Book rides instantly with Uber. Frequent first-ride credits and promo codes available.',
  },
  {
    name: 'Uber Eats',
    category: 'Restaurants & Dining',
    url: 'https://www.ubereats.com',
    description:
      'Food delivery from your favourite restaurants. Regular delivery fee waivers and percentage discounts.',
  },
  {
    name: 'Glovo',
    category: 'Restaurants & Dining',
    url: 'https://glovoapp.com',
    description:
      'On-demand delivery of food, groceries and more. Popular in Europe with heavy promo code usage.',
  },
  {
    name: "Domino's Pizza",
    category: 'Restaurants & Dining',
    url: 'https://www.dominos.com',
    description:
      "America's favourite pizza delivery brand. Consistent coupon and promo code activity.",
  },
  {
    name: 'DoorDash',
    category: 'Restaurants & Dining',
    url: 'https://www.doordash.com',
    description:
      'Leading food delivery marketplace. High volume of promo code searches and first-order discounts.',
  },
  {
    name: 'Grubhub',
    category: 'Restaurants & Dining',
    url: 'https://www.grubhub.com',
    description:
      'Online food ordering and delivery. Frequent first-order and Grubhub+ subscription discounts.',
  },

  // ── Apparel & Fashion ────────────────────────────────────────────────────
  {
    name: 'Nike',
    category: 'Sports Apparel',
    url: 'https://www.nike.com',
    description:
      'Iconic sportswear and footwear brand. High volume of verified working coupon codes.',
  },
  {
    name: 'Adidas',
    category: 'Sports Apparel',
    url: 'https://www.adidas.com',
    description:
      'Global sportswear leader. Consistent promo activity with users actively sharing codes.',
  },
  {
    name: 'Edikted',
    category: 'Fashion',
    url: 'https://edikted.com',
    description:
      'Trendy fast-fashion brand. Currently ranks #1 for promo code availability with massive verified inventory.',
  },
  {
    name: 'Wear Felicity',
    category: 'Fashion',
    url: 'https://wearfelicity.com',
    description:
      'Online apparel retailer ranked #2 for promo code reliability with a consistent publishing cadence.',
  },
  {
    name: 'Everlane',
    category: 'Fashion',
    url: 'https://www.everlane.com',
    description:
      'Modern, ethical apparel brand. Strong editor-tested code reliability and healthy copy rate.',
  },
  {
    name: 'HALARA',
    category: 'Sports Apparel',
    url: 'https://www.halara.com',
    description:
      'Activewear and fashion brand known for frequent promotions and solid inventory depth.',
  },
  {
    name: 'FIGS',
    category: 'Fashion',
    url: 'https://www.wearfigs.com',
    description:
      'Premium healthcare apparel. Major demand as shoppers actively hunt for scrub discounts.',
  },
  {
    name: 'JCPenney',
    category: "Women's Fashion",
    url: 'https://www.jcpenney.com',
    description:
      'American department store chain with a free rewards program. Users earn points redeemable for coupons.',
  },
  {
    name: "Kohl's",
    category: "Women's Fashion",
    url: 'https://www.kohls.com',
    description:
      "Department store with a rewards program giving 5% back. Users actively share Kohl's Cash deals.",
  },
  {
    name: "Macy's",
    category: "Women's Fashion",
    url: 'https://www.macys.com',
    description:
      'Iconic American department store. Star Rewards program — users share Star Money and percent-off codes.',
  },
  {
    name: 'H&M',
    category: 'Fashion',
    url: 'https://www.hm.com',
    description:
      'Global fast-fashion retailer. Frequent seasonal sales and member discount codes.',
  },
  {
    name: 'Zara',
    category: 'Fashion',
    url: 'https://www.zara.com',
    description:
      'Spanish fast-fashion giant with high traffic during sales seasons. Users share outlet and promo links.',
  },
  {
    name: 'ASOS',
    category: 'Fashion',
    url: 'https://www.asos.com',
    description:
      'Online fashion and cosmetics retailer popular globally. Frequent student and seasonal discount codes.',
  },
  {
    name: 'Shein',
    category: 'Fashion',
    url: 'https://www.shein.com',
    description:
      'Ultra-fast fashion e-commerce brand. Very high promo code search volume, especially for first orders.',
  },

  // ── Health & Wellness ────────────────────────────────────────────────────
  {
    name: 'DRMTLGY',
    category: 'Skincare',
    url: 'https://drmtlgy.com',
    description:
      'Dermatologist-developed skincare. Ranks #3 in promo code index with near-perfect editor verification.',
  },
  {
    name: 'Happy Mammoth',
    category: 'Health & Beauty',
    url: 'https://happymammoth.com',
    description:
      'Health and wellness supplements brand. Ranks #5 with steady verified offers and consistent publishing.',
  },
  {
    name: 'Boxbollen',
    category: 'Fitness & Wellness',
    url: 'https://boxbollen.com',
    description:
      'Fitness product brand. Ranks #6 for promo codes with strong real-world usage and reliability.',
  },
  {
    name: 'GNC',
    category: 'Health & Beauty',
    url: 'https://www.gnc.com',
    description:
      'Leading health supplement retailer. Popular for vitamins and protein with frequent percentage-off codes.',
  },
  {
    name: 'Peloton',
    category: 'Fitness Equipment',
    url: 'https://www.onepeloton.com',
    description:
      'Premium interactive fitness equipment. Users actively seek referral codes and bundle discounts.',
  },
  {
    name: 'ClassPass',
    category: 'Fitness & Wellness',
    url: 'https://classpass.com',
    description:
      'Fitness class subscription platform. Users regularly share first-month deals and referral credits.',
  },
  {
    name: 'iHerb',
    category: 'Health & Beauty',
    url: 'https://www.iherb.com',
    description:
      'Major online retailer for supplements and wellness. Ranks #13 with steady promo activity.',
  },
  {
    name: 'Calm',
    category: 'Health & Beauty',
    url: 'https://www.calm.com',
    description:
      'Meditation and sleep app. Users share annual subscription discounts and free-trial extension codes.',
  },

  // ── Electronics & Office ─────────────────────────────────────────────────
  {
    name: 'Best Buy',
    category: 'Electronics',
    url: 'https://www.bestbuy.com',
    description:
      'Leading consumer electronics retailer. My Best Buy program offers member-only prices and frequent coupon activity.',
  },
  {
    name: 'Zenni Optical',
    category: 'Health & Beauty',
    url: 'https://www.zennioptical.com',
    description:
      'Affordable prescription eyewear online. Ranks #8 with strong verified code inventory and monthly cadence.',
  },
  {
    name: 'Newegg',
    category: 'Electronics',
    url: 'https://www.newegg.com',
    description:
      'Online tech and computer hardware retailer. Frequent flash sales and promo code events.',
  },
  {
    name: 'Apple',
    category: 'Electronics',
    url: 'https://www.apple.com',
    description:
      'Technology company. Users share education discounts, refurbished deals and seasonal promotions.',
  },

  // ── Pet Supplies ─────────────────────────────────────────────────────────
  {
    name: 'Chewy',
    category: 'Pet Supplies',
    url: 'https://www.chewy.com',
    description:
      'Online pet supplies retailer. Ranks #10 with massive shopper demand and steady code cadence.',
  },
  {
    name: 'Petco',
    category: 'Pet Supplies',
    url: 'https://www.petco.com',
    description:
      'Pet supplies chain with Vital Care rewards program. Users share grooming and nutrition deals.',
  },

  // ── Home & Lifestyle ─────────────────────────────────────────────────────
  {
    name: 'Target',
    category: 'Home & Garden',
    url: 'https://www.target.com',
    description:
      'American retail chain. Target Circle rewards program with users sharing app-exclusive deals.',
  },
  {
    name: 'The Container Store',
    category: 'Home & Garden',
    url: 'https://www.containerstore.com',
    description:
      'Storage and organisation retailer. Popular for home organisation with frequent percentage-off coupons.',
  },
  {
    name: 'Bed Bath & Beyond',
    category: 'Bedding & Bath',
    url: 'https://www.bedbathandbeyond.com',
    description:
      'Home goods retailer. Welcome Rewards+ gives 5% back and users share coupons regularly.',
  },
  {
    name: 'Bath & Body Works',
    category: 'Personal Care',
    url: 'https://www.bathandbodyworks.com',
    description:
      'Personal care and home fragrance brand. My B&BW rewards program — users share free product reward codes.',
  },
  {
    name: "Dick's Sporting Goods",
    category: 'Sports & Outdoors',
    url: 'https://www.dickssportinggoods.com',
    description:
      'Sporting goods retailer with ScoreCard rewards. Users share points-based rewards and clearance codes.',
  },
  {
    name: 'Home Depot',
    category: 'Tools & Hardware',
    url: 'https://www.homedepot.com',
    description:
      'Home improvement retail giant. Pro Xtra program — users share volume pricing and paint discounts.',
  },
  {
    name: 'IKEA',
    category: 'Furniture',
    url: 'https://www.ikea.com',
    description:
      'Swedish furniture and home goods giant. High demand — users share seasonal promotions and family offers.',
  },
  {
    name: 'Wayfair',
    category: 'Furniture',
    url: 'https://www.wayfair.com',
    description:
      'Online home goods retailer. Frequent sitewide sales with users actively sharing promo codes.',
  },

  // ── Subscription & Meal Kits ─────────────────────────────────────────────
  {
    name: 'HelloFresh',
    category: 'Food & Beverages',
    url: 'https://www.hellofresh.com',
    description:
      'Meal kit delivery service. High referral activity — users share first-box and free-week discounts.',
  },
  {
    name: 'Factor',
    category: 'Food & Beverages',
    url: 'https://www.factormeals.com',
    description:
      'Ready-made meal delivery service. Steady promo code publishing similar to HelloFresh.',
  },
  {
    name: 'TurboTax',
    category: 'Software & Apps',
    url: 'https://turbotax.intuit.com',
    description:
      'Tax preparation software. Seasonal high demand — users share discount codes during tax season.',
  },
  {
    name: 'H&R Block',
    category: 'Software & Apps',
    url: 'https://www.hrblock.com',
    description:
      'Tax preparation service. Same seasonal pattern as TurboTax with active code sharing.',
  },
  {
    name: 'Rakuten',
    category: 'Financial Services',
    url: 'https://www.rakuten.com',
    description:
      'Cashback shopping platform. Users share referral bonuses and increased cashback rate events.',
  },

  // ── Other High-Demand Retailers ──────────────────────────────────────────
  {
    name: 'JomaShop',
    category: 'Jewelry & Watches',
    url: 'https://www.jomashop.com',
    description:
      'Luxury watches and accessories discounter. Ranks #11 with a deep bench of live, verified codes.',
  },
  {
    name: '4imprint',
    category: 'Office Supplies',
    url: 'https://www.4imprint.com',
    description:
      'Promotional products supplier. Ranks #7 for reliability — great for bulk order discounts.',
  },
  {
    name: 'Walmart',
    category: 'Grocery',
    url: 'https://www.walmart.com',
    description:
      'American retail giant. Walmart+ members get delivery perks — users share subscription and rollback deals.',
  },
  {
    name: 'Amazon',
    category: 'Electronics',
    url: 'https://www.amazon.com',
    description:
      "World's largest online marketplace. Massive demand — users share lightning deals and exclusive promo codes.",
  },
  {
    name: 'eBay',
    category: 'Electronics',
    url: 'https://www.ebay.com',
    description:
      'Global online marketplace. Frequent sitewide coupon events — users actively share codes and cashback offers.',
  },
  {
    name: 'Etsy',
    category: 'Home Decor',
    url: 'https://www.etsy.com',
    description:
      'Handmade and vintage goods marketplace. Sellers often provide discount codes; users share them widely.',
  },
  {
    name: 'Costco',
    category: 'Grocery',
    url: 'https://www.costco.com',
    description:
      'Membership-based wholesale retailer. Users share monthly coupon book deals and online-exclusive savings.',
  },
  {
    name: 'Sephora',
    category: 'Makeup & Cosmetics',
    url: 'https://www.sephora.com',
    description:
      'Beauty retailer with Beauty Insider rewards. Users share points redemption events and birthday gift codes.',
  },
  {
    name: 'Ulta Beauty',
    category: 'Makeup & Cosmetics',
    url: 'https://www.ulta.com',
    description:
      'Beauty superstore. Ultamate Rewards program — users share 21 Days of Beauty deals and promo codes.',
  },
  {
    name: 'Booking.com',
    category: 'Hotels & Accommodation',
    url: 'https://www.booking.com',
    description:
      'Global hotel and accommodation booking platform. Users share Genius loyalty discounts and flash deals.',
  },
  {
    name: 'Airbnb',
    category: 'Hotels & Accommodation',
    url: 'https://www.airbnb.com',
    description:
      'Short-term accommodation marketplace. Referral credits and first-booking discounts shared by users.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveCategories(stores) {
  const uniqueCategoryNames = [...new Set(stores.map((s) => s.category))];
  const categories = await Category.find({ name: { $in: uniqueCategoryNames } }).select('_id name');
  const map = {};
  categories.forEach((c) => (map[c.name] = c._id));

  const missing = uniqueCategoryNames.filter((n) => !map[n]);
  if (missing.length) {
    console.warn(`\n⚠️  Categories not found in DB (stores will use null categoryId):\n  ${missing.join(', ')}`);
    console.warn('  Run: node server/scripts/seedCategories.js\n');
  }
  return map;
}

async function findAdminUser() {
  const admin = await User.findOne({ role: { $in: ['admin', 'superAdmin', 'superadmin'] } }).select('_id email');
  if (!admin) {
    const anyUser = await User.findOne().select('_id email');
    if (!anyUser) throw new Error('No users found in the database. Create an admin user first.');
    console.warn(`⚠️  No admin user found — using first available user: ${anyUser.email}`);
    return anyUser._id;
  }
  console.log(`✅ Using admin user: ${admin.email} (${admin._id})`);
  return admin._id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedPopularStores() {
  const mongoUri =
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ No MongoDB URI found. Set MONGO_URL in your .env file.');
    process.exit(1);
  }

  if (!LOGO_DEV_TOKEN) {
    console.warn('\n⚠️  LOGO_DEV_TOKEN not set — stores will be seeded without logos.');
    console.warn('   Get a free token at https://www.logo.dev and add to .env:');
    console.warn('   LOGO_DEV_TOKEN=pk_xxxxxxxxxxxx\n');
  } else {
    console.log(`✅ Logo.dev token found — logos will be generated automatically.\n`);
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB\n');

  try {
    const adminUserId = await findAdminUser();
    const categoryMap = await resolveCategories(STORES);

    const existingNames = new Set(
      (await Store.find({}).select('name')).map((s) => s.name.toLowerCase())
    );
    console.log(`\n📦 ${existingNames.size} stores already in database.\n`);

    const toInsert = [];
    const skipped = [];

    for (const s of STORES) {
      if (existingNames.has(s.name.toLowerCase())) {
        skipped.push(s.name);
        continue;
      }
      toInsert.push({
        name: s.name,
        userId: adminUserId,
        description: s.description,
        logo: logoUrl(s.url),
        url: s.url,
        categoryId: categoryMap[s.category] || null,
        storeType: 'none',
        isActive: true,
        isSponsored: false,
        isWorldwide: true,
        availableCountries: ['WORLDWIDE'],
      });
    }

    if (skipped.length) {
      console.log(`⏭️  Skipped (already exist): ${skipped.join(', ')}\n`);
    }

    // ── Insert new stores ──────────────────────────────────────────────────
    let insertedCount = 0;
    if (toInsert.length > 0) {
      const inserted = await Store.insertMany(toInsert, { ordered: false });
      insertedCount = inserted.length;
      console.log(`✅ Inserted ${insertedCount} new stores:\n`);
      inserted.forEach((s) => {
        const logoStatus = s.logo ? '🖼 ' : '(no logo)';
        console.log(`  ✓ ${logoStatus}  ${s.name} — ${s.url}`);
      });
    } else {
      console.log('✅ No new stores to insert (all already exist).\n');
    }

    // ── Patch logos on existing stores that have no logo (when token is set) ──
    if (LOGO_DEV_TOKEN && skipped.length > 0) {
      console.log('\n🖼  Patching logos on existing stores that have no logo…\n');
      const storeUrlMap = Object.fromEntries(STORES.map((s) => [s.name.toLowerCase(), s.url]));
      let patchedCount = 0;

      const existingNoLogo = await Store.find({
        name: { $in: skipped },
        $or: [{ logo: { $exists: false } }, { logo: '' }, { logo: null }],
      }).select('_id name url');

      for (const store of existingNoLogo) {
        const storeUrl = store.url || storeUrlMap[store.name.toLowerCase()];
        if (!storeUrl) continue;
        const logo = logoUrl(storeUrl);
        if (!logo) continue;
        await Store.updateOne({ _id: store._id }, { $set: { logo } });
        console.log(`  🖼  Updated logo for: ${store.name}`);
        patchedCount++;
      }

      if (patchedCount === 0) {
        console.log('  All existing stores already have logos.');
      } else {
        console.log(`\n  ✅ Patched logos on ${patchedCount} existing store(s).`);
      }
    }

    console.log(`\n📊 Summary: ${insertedCount} inserted, ${skipped.length} already existed.`);

    if (!LOGO_DEV_TOKEN) {
      console.log('\n💡 Tip: Add LOGO_DEV_TOKEN to your .env and re-run to fill in logos.');
      console.log('   (Re-running is safe — existing stores are updated automatically.)');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

seedPopularStores().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
