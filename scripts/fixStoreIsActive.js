/**
 * One-time migration: set isActive:true on every store that is missing the field.
 * Safe to re-run — only updates documents where isActive does not exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');

async function main() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅  Connected to MongoDB\n');

  const total  = await Store.countDocuments();
  const missing = await Store.countDocuments({ isActive: { $exists: false } });
  console.log(`📊  Total stores      : ${total}`);
  console.log(`📊  Missing isActive  : ${missing}`);

  if (missing === 0) {
    console.log('\n✅  Nothing to update — all stores already have isActive set.');
  } else {
    const result = await Store.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`\n✅  Patched ${result.modifiedCount} stores → isActive: true`);
  }

  const active = await Store.countDocuments({ isActive: true });
  const inactive = await Store.countDocuments({ isActive: false });
  console.log(`\n📊  isActive: true   : ${active}`);
  console.log(`📊  isActive: false  : ${inactive}`);

  await mongoose.disconnect();
  console.log('\n✅  Done!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
