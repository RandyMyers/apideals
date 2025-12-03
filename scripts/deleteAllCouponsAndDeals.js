/**
 * Script to delete all coupons and deals from the database
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Error: MongoDB URI environment variable is not set');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Main function
const deleteAllCouponsAndDeals = async () => {
  try {
    console.log('\n=== Deleting All Coupons and Deals ===\n');
    
    // Delete all coupons
    const couponResult = await Coupon.deleteMany({});
    console.log(`✅ Deleted ${couponResult.deletedCount} coupons`);
    
    // Delete all deals
    const dealResult = await Deal.deleteMany({});
    console.log(`✅ Deleted ${dealResult.deletedCount} deals`);
    
    console.log('\n=== Deletion Complete ===');
    console.log(`Total coupons deleted: ${couponResult.deletedCount}`);
    console.log(`Total deals deleted: ${dealResult.deletedCount}\n`);
    
  } catch (error) {
    console.error('❌ Error deleting coupons/deals:', error);
    throw error;
  }
};

// Run script
const main = async () => {
  try {
    await connectDB();
    await deleteAllCouponsAndDeals();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

main();

