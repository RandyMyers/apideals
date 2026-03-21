/**
 * Diagnose & Fix Category ↔ Store links.
 *
 * Problem: seeded stores have a text "category" field (e.g. "Travel") but
 * Store.categoryId (ObjectId) may point to the wrong Category, or Category.storeId
 * (the array on the Category doc) may be empty.
 *
 * This script:
 *   1. Reports the current state.
 *   2. For every store whose categoryId is null/missing, attempts to match the
 *      store's category name string to an existing Category by name.
 *   3. Sets Store.categoryId to the matched Category._id.
 *   4. Rebuilds the Category.storeId array for every category so it
 *      matches what Store.categoryId actually says.
 *
 * Usage: node server/scripts/fixCategoryStoreLinks.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store    = require('../models/store');
const Category = require('../models/category');

// Map of seed category strings → canonical Category names in the DB.
// Adjust if your Category names differ.
const CATEGORY_ALIASES = {
  'ride-hailing':       'Travel',
  'food delivery':      'Food & Dining',
  'food/goods delivery':'Food & Dining',
  'activewear':         'Fashion',
  'fast fashion':       'Fashion',
  'apparel':            'Fashion',
  'activewear/fashion': 'Fashion',
  'healthcare apparel': 'Fashion',
  'department store':   'Fashion',
  'skincare':           'Health & Beauty',
  'health & wellness':  'Health & Beauty',
  'fitness':            'Health & Beauty',
  'supplements':        'Health & Beauty',
  'fitness equipment':  'Health & Beauty',
  'fitness classes':    'Health & Beauty',
  'supplements/wellness':'Health & Beauty',
  'mental health':      'Health & Beauty',
  'electronics':        'Electronics',
  'office':             'Electronics',
  'eyewear':            'Electronics',
  'pet supplies':       'Pets',
  'general retail':     'Shopping',
  'organization':       'Home & Garden',
  'home goods':         'Home & Garden',
  'personal care':      'Health & Beauty',
  'sporting goods':     'Sports & Outdoors',
  'home improvement':   'Home & Garden',
  'furniture':          'Home & Garden',
  'meal kits':          'Food & Dining',
  'software':           'Technology',
  'cashback':           'Finance',
  'luxury goods/watches':'Shopping',
  'promotional products':'Shopping',
  'marketplace':        'Shopping',
  'travel':             'Travel',
};

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  // ── 1. Current state ────────────────────────────────────────────────────
  const categories = await Category.find().lean();
  const stores     = await Store.find().lean();

  console.log(`📊  Categories in DB : ${categories.length}`);
  console.log(`📊  Stores in DB     : ${stores.length}`);

  const withCatId    = stores.filter(s => s.categoryId);
  const withoutCatId = stores.filter(s => !s.categoryId);
  console.log(`📊  Stores with categoryId    : ${withCatId.length}`);
  console.log(`📊  Stores without categoryId : ${withoutCatId.length}\n`);

  if (categories.length === 0) {
    console.log('⚠️   No categories in DB — create some categories first.\n');
    await mongoose.disconnect();
    return;
  }

  // Build a lookup: lowercase category name → Category doc
  const catByName = {};
  for (const cat of categories) {
    catByName[cat.name.toLowerCase()] = cat;
  }

  // ── 2. Try to fix stores missing categoryId ──────────────────────────────
  let fixed = 0;
  for (const store of withoutCatId) {
    // The Store schema has no "category" text field — but seeds may have stored
    // the category name inside a custom field or we can infer from store name.
    // Try each category name to find any partial match in store.name:
    let matched = null;
    for (const cat of categories) {
      // simple substring match — adjust if needed
      if (store.name?.toLowerCase().includes(cat.name.toLowerCase()) ||
          cat.name?.toLowerCase().includes(store.name?.toLowerCase())) {
        matched = cat;
        break;
      }
    }

    if (matched) {
      await Store.updateOne({ _id: store._id }, { $set: { categoryId: matched._id } });
      console.log(`  ✅  "${store.name}"  →  category "${matched.name}"`);
      fixed++;
    } else {
      console.log(`  ⚠️   "${store.name}"  →  no category matched`);
    }
  }
  console.log(`\n✅  Fixed ${fixed} stores\n`);

  // ── 3. Rebuild Category.storeId arrays ──────────────────────────────────
  // Re-fetch stores with updated categoryId
  const allStores = await Store.find({}, '_id categoryId name').lean();

  // Group by categoryId
  const storesByCat = {};
  for (const s of allStores) {
    if (!s.categoryId) continue;
    const key = s.categoryId.toString();
    if (!storesByCat[key]) storesByCat[key] = [];
    storesByCat[key].push(s._id);
  }

  console.log('🔄  Rebuilding Category.storeId arrays...');
  for (const cat of categories) {
    const storeIds = storesByCat[cat._id.toString()] || [];
    await Category.updateOne({ _id: cat._id }, { $set: { storeId: storeIds } });
    console.log(`  ✅  "${cat.name}"  →  ${storeIds.length} stores`);
  }

  console.log('\n✅  Category-store links rebuilt!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌  Script failed:', err.message);
  process.exit(1);
});
