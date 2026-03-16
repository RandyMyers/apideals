/**
 * Simulate the exact API call the admin makes: GET /coupons/all?admin=true
 * Run: node server/scripts/testCouponsApiResponse.js
 *
 * Uses the running server - start server first, or this will fail.
 * Alternatively, we can require the controller and call it directly.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
require('../models/store'); // Register Store for populate
require('../models/category'); // Register Category for populate

async function run() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    // Simulate the exact query the API uses when admin=true
    const query = {}; // admin=true means empty query
    const coupons = await Coupon.find(query)
      .populate({
        path: 'storeId',
        select: 'name website logo',
        strictPopulate: false,
      })
      .populate({
        path: 'categoryId',
        select: 'name',
        strictPopulate: false,
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log('API response simulation (GET /coupons/all?admin=true):');
    console.log(`  Total coupons returned: ${coupons.length}`);
    console.log('\nFirst 5 coupons (newest):');
    coupons.slice(0, 5).forEach((c, i) => {
      console.log(
        `  ${i + 1}. ${c._id} | ${c.code || '-'} | ${c.title?.slice(0, 30) || '-'} | storeId: ${c.storeId ? (c.storeId.name || c.storeId._id) : 'null'}`
      );
    });

    // Check for March 14 coupons
    const march14 = coupons.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === 2 && d.getDate() === 14; // March = month 2
    });
    console.log(`\nCoupons from March 14: ${march14.length}`);
    march14.forEach((c) => {
      console.log(`  - ${c.code} | ${c.title?.slice(0, 40)}`);
    });

    console.log('\nConclusion: API would return', coupons.length, 'coupons. All should appear in admin.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
