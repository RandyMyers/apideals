require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/category');
const { generateSlug } = require('../utils/seoUtils');

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  const categories = await Category.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  console.log(`📦  Categories missing slug: ${categories.length}`);

  let updated = 0;
  for (const cat of categories) {
    let slug = generateSlug(cat.name);
    // Ensure uniqueness
    const existing = await Category.findOne({ slug, _id: { $ne: cat._id } });
    if (existing) slug = `${slug}-${cat._id.toString().slice(-4)}`;
    cat.slug = slug;
    await cat.save();
    console.log(`  ✅  "${cat.name}"  →  "${slug}"`);
    updated++;
  }

  console.log(`\n✅  Updated ${updated} categories.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
