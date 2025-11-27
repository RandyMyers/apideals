const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Campaign = require('../models/campaign');

/**
 * Migration script to add location targeting fields to existing data
 * Sets all existing stores, coupons, deals, and campaigns to WORLDWIDE by default
 */
const migrateLocationTargeting = async () => {
  try {
    // Use the same connection method as app.js
    const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/dealcouponz';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log('Connected to MongoDB');
    console.log('Starting location targeting migration...\n');

    // Migrate Stores
    const storeResult = await Store.updateMany(
      {
        $or: [
          { availableCountries: { $exists: false } },
          { isWorldwide: { $exists: false } }
        ]
      },
      {
        $set: {
          availableCountries: ['WORLDWIDE'],
          isWorldwide: true
        }
      }
    );
    console.log(`✓ Updated ${storeResult.modifiedCount} stores`);

    // Migrate Coupons
    const couponResult = await Coupon.updateMany(
      {
        $or: [
          { availableCountries: { $exists: false } },
          { isWorldwide: { $exists: false } }
        ]
      },
      {
        $set: {
          availableCountries: ['WORLDWIDE'],
          isWorldwide: true
        }
      }
    );
    console.log(`✓ Updated ${couponResult.modifiedCount} coupons`);

    // Migrate Deals
    const dealResult = await Deal.updateMany(
      {
        $or: [
          { availableCountries: { $exists: false } },
          { isWorldwide: { $exists: false } }
        ]
      },
      {
        $set: {
          availableCountries: ['WORLDWIDE'],
          isWorldwide: true
        }
      }
    );
    console.log(`✓ Updated ${dealResult.modifiedCount} deals`);

    // Migrate Campaigns
    const campaignResult = await Campaign.updateMany(
      {
        $or: [
          { 'settings.targetCountries': { $exists: false } },
          { 'settings.isWorldwide': { $exists: false } }
        ]
      },
      {
        $set: {
          'settings.targetCountries': ['WORLDWIDE'],
          'settings.isWorldwide': true
        }
      }
    );
    console.log(`✓ Updated ${campaignResult.modifiedCount} campaigns`);

    console.log('\n✅ Location targeting migration completed successfully!');
    console.log(`   - Stores: ${storeResult.modifiedCount} updated`);
    console.log(`   - Coupons: ${couponResult.modifiedCount} updated`);
    console.log(`   - Deals: ${dealResult.modifiedCount} updated`);
    console.log(`   - Campaigns: ${campaignResult.modifiedCount} updated`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
};

migrateLocationTargeting();


