/**
 * Migration: Generate slugs for all existing Coupons and Deals that don't have one.
 * The pre-save hook on each model generates: {title|code|name}-{last-6-of-_id}
 * We trigger it by loading each doc and calling .save().
 *
 * Usage: node server/scripts/generateCouponDealSlugs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const Deal   = require('../models/deal');

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  // ── Coupons ──────────────────────────────────────────────────────────────
  const coupons = await Coupon.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  console.log(`📦  Coupons missing a slug: ${coupons.length}`);

  let couponUpdated = 0;
  for (const c of coupons) {
    try {
      await c.save(); // pre-save hook generates the slug
      couponUpdated++;
    } catch (err) {
      console.warn(`  ⚠️  Coupon ${c._id}: ${err.message}`);
    }
  }
  console.log(`✅  Coupons updated: ${couponUpdated}\n`);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const deals = await Deal.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  console.log(`📦  Deals missing a slug: ${deals.length}`);

  let dealUpdated = 0;
  for (const d of deals) {
    try {
      await d.save(); // pre-save hook generates the slug
      dealUpdated++;
    } catch (err) {
      console.warn(`  ⚠️  Deal ${d._id}: ${err.message}`);
    }
  }
  console.log(`✅  Deals updated: ${dealUpdated}\n`);

  console.log('✅  Migration complete!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
