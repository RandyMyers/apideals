require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

const checkData = async () => {
  try {
    // Connect to MongoDB using the same method as app.js
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Check Stores
    console.log('\n=== STORES ===');
    const allStores = await Store.find({}).lean();
    const activeStores = await Store.find({ isActive: true }).lean();
    console.log(`Total stores: ${allStores.length}`);
    console.log(`Active stores: ${activeStores.length}`);
    console.log('\nStore details:');
    allStores.forEach(store => {
      console.log(`- ${store.name}: isActive=${store.isActive}, availableCountries=${JSON.stringify(store.availableCountries)}, isWorldwide=${store.isWorldwide}`);
    });

    // Check Coupons
    console.log('\n=== COUPONS ===');
    const allCoupons = await Coupon.find({}).lean();
    const activeCoupons = await Coupon.find({ isActive: true }).lean();
    const now = new Date();
    const validCoupons = await Coupon.find({
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    }).lean();
    console.log(`Total coupons: ${allCoupons.length}`);
    console.log(`Active coupons: ${activeCoupons.length}`);
    console.log(`Valid coupons (active + not expired): ${validCoupons.length}`);
    console.log('\nCoupon details:');
    allCoupons.forEach(coupon => {
      const endDateStr = coupon.endDate ? new Date(coupon.endDate).toISOString() : 'null';
      const isExpired = coupon.endDate && new Date(coupon.endDate) < now;
      console.log(`- ${coupon.code || coupon.title || 'N/A'}: isActive=${coupon.isActive}, endDate=${endDateStr}, expired=${isExpired}`);
    });

    // Check Deals
    console.log('\n=== DEALS ===');
    const allDeals = await Deal.find({}).lean();
    const activeDeals = await Deal.find({ isActive: true }).lean();
    const validDeals = await Deal.find({
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    }).lean();
    console.log(`Total deals: ${allDeals.length}`);
    console.log(`Active deals: ${activeDeals.length}`);
    console.log(`Valid deals (active + not expired): ${validDeals.length}`);
    console.log('\nDeal details:');
    allDeals.forEach(deal => {
      const endDateStr = deal.endDate ? new Date(deal.endDate).toISOString() : 'null';
      const isExpired = deal.endDate && new Date(deal.endDate) < now;
      console.log(`- ${deal.name || deal.title || 'N/A'}: isActive=${deal.isActive}, endDate=${endDateStr}, expired=${isExpired}`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Check complete');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkData();

