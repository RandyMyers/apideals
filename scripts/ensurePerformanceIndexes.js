/**
 * Create compound indexes for list/query performance.
 *
 * Usage: node scripts/ensurePerformanceIndexes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const View = require('../models/view');

const INDEXES = [
  { model: Coupon, keys: { storeId: 1, isPublished: 1, isActive: 1, createdAt: -1 }, name: 'coupon_store_list' },
  { model: Coupon, keys: { siteId: 1, isPublished: 1, isActive: 1, createdAt: -1 }, name: 'coupon_site_list' },
  { model: Deal, keys: { store: 1, isPublished: 1, isActive: 1, createdAt: -1 }, name: 'deal_store_list' },
  { model: Deal, keys: { siteId: 1, isPublished: 1, isActive: 1, createdAt: -1 }, name: 'deal_site_list' },
  { model: Store, keys: { siteId: 1, isActive: 1 }, name: 'store_site_active' },
  { model: Store, keys: { categoryId: 1, isActive: 1 }, name: 'store_category_active' },
  { model: View, keys: { storeId: 1, viewedAt: -1 }, name: 'view_store_viewed' },
];

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGO_URL');
    process.exit(1);
  }
  await mongoose.connect(uri);
  for (const { model, keys, name } of INDEXES) {
    await model.collection.createIndex(keys, { name, background: true });
    console.log('OK:', name);
  }
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
