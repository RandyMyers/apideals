require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

const fixData = async () => {
  try {
    // Connect to MongoDB using the same method as app.js
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6); // 6 months from now

    // Fix Stores - set isWorldwide to true if undefined
    console.log('\n=== FIXING STORES ===');
    const storesToFix = await Store.find({
      $or: [
        { isWorldwide: { $exists: false } },
        { isWorldwide: null },
        { availableCountries: { $exists: false } },
        { availableCountries: null }
      ]
    });
    
    if (storesToFix.length > 0) {
      const result = await Store.updateMany(
        {
          $or: [
            { isWorldwide: { $exists: false } },
            { isWorldwide: null },
            { availableCountries: { $exists: false } },
            { availableCountries: null }
          ]
        },
        {
          $set: {
            isWorldwide: true,
            availableCountries: ['WORLDWIDE']
          }
        }
      );
      console.log(`Updated ${result.modifiedCount} stores with default country settings`);
    } else {
      console.log('No stores need fixing');
    }

    // Fix Coupons - update expired endDate to future date
    console.log('\n=== FIXING COUPONS ===');
    const expiredCoupons = await Coupon.find({
      isActive: true,
      endDate: { $lt: now }
    });
    
    if (expiredCoupons.length > 0) {
      const result = await Coupon.updateMany(
        {
          isActive: true,
          endDate: { $lt: now }
        },
        {
          $set: {
            endDate: futureDate
          }
        }
      );
      console.log(`Updated ${result.modifiedCount} expired coupons with new endDate: ${futureDate.toISOString()}`);
    } else {
      console.log('No expired coupons to fix');
    }

    // Fix Deals - update expired endDate to future date
    console.log('\n=== FIXING DEALS ===');
    const expiredDeals = await Deal.find({
      isActive: true,
      endDate: { $lt: now }
    });
    
    if (expiredDeals.length > 0) {
      const result = await Deal.updateMany(
        {
          isActive: true,
          endDate: { $lt: now }
        },
        {
          $set: {
            endDate: futureDate
          }
        }
      );
      console.log(`Updated ${result.modifiedCount} expired deals with new endDate: ${futureDate.toISOString()}`);
    } else {
      console.log('No expired deals to fix');
    }

    // Verify fixes
    console.log('\n=== VERIFICATION ===');
    const activeStores = await Store.find({ isActive: true }).countDocuments();
    const validCoupons = await Coupon.find({
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    }).countDocuments();
    const validDeals = await Deal.find({
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    }).countDocuments();
    
    console.log(`Active stores: ${activeStores}`);
    console.log(`Valid coupons (active + not expired): ${validCoupons}`);
    console.log(`Valid deals (active + not expired): ${validDeals}`);

    await mongoose.connection.close();
    console.log('\n✓ Fix complete');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixData();

