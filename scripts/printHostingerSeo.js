/**
 * Print Hostinger store SEO fields from MongoDB.
 *
 * Usage:
 *   node scripts/printHostingerSeo.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const st = await Store.findOne({ seoSlug: 'hostinger-coupon-code' })
    .select('name slug seoSlug logoAlt seo contentUpdatedAt lastVerifiedAt faqs languageTranslations')
    .lean();
  console.log(JSON.stringify(st, null, 2));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

