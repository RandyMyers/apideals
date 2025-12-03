/**
 * Script to delete all coupons from the database
 * Usage: node scripts/deleteAllCoupons.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');

const deleteAllCoupons = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    if (!process.env.MONGO_URL) {
      console.error('❌ Error: MONGO_URL environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const count = await Coupon.countDocuments();
    console.log(`📊 Found ${count} coupons in database`);

    if (count === 0) {
      console.log('✅ No coupons to delete');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️  Deleting all coupons...');
    const result = await Coupon.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} coupons`);

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

deleteAllCoupons();

