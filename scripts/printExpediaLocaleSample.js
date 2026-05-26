/**
 * Print a sample locale payload for Expedia store.
 *
 * Usage:
 *   node scripts/printExpediaLocaleSample.js fr
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');

async function run() {
  const locale = process.argv[2] || 'fr';
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const st = await Store.findOne({ seoSlug: 'expedia-coupon-codes' })
    .select('languageTranslations')
    .lean();

  const row = st?.languageTranslations?.[locale];
  console.log(JSON.stringify({ locale, logoAlt: row?.logoAlt, faq0: row?.faqs?.[0]?.question }, null, 2));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

