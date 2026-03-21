/**
 * Migration: Generate slugs for all existing stores that don't have one.
 * Safe to re-run — only updates stores where slug is missing.
 *
 * Usage: node server/scripts/generateStoreSlugs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const { generateSlug } = require('../utils/seoUtils');

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  const stores = await Store.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  console.log(`📊  Stores missing a slug: ${stores.length}\n`);

  if (stores.length === 0) {
    console.log('✅  All stores already have slugs.');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const store of stores) {
    const base = generateSlug(store.name);
    if (!base) {
      console.warn(`  ⚠️  Could not generate slug for "${store.name}" — skipping`);
      skipped++;
      continue;
    }

    // Ensure uniqueness: append a counter if the slug is already taken
    let slug = base;
    let attempt = 1;
    while (await Store.exists({ slug, _id: { $ne: store._id } })) {
      slug = `${base}-${attempt++}`;
    }

    store.slug = slug;
    await store.save();
    console.log(`  ✅  "${store.name}"  →  "${slug}"`);
    updated++;
  }

  console.log(`\n✅  Updated: ${updated}  |  Skipped: ${skipped}`);

  // Show a sample of all slugs for verification
  const sample = await Store.find({}, 'name slug').sort({ name: 1 }).lean();
  console.log('\n📋  All store slugs:');
  sample.forEach(s => console.log(`  ${s.slug || '(none)'.padEnd(30)}  ←  ${s.name}`));

  await mongoose.disconnect();
  console.log('\n✅  Done!');
}

main().catch(err => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
