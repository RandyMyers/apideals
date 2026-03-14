/**
 * Fix coupons with placeholder productUrl ("...", "", "N/A") that cause duplicate key errors.
 * Updates them to use __all_products__{code} for site-wide coupons.
 * For duplicates (same code+storeId+placeholder), keeps the most recent and removes others.
 * Run: node server/scripts/fixCouponProductUrlPlaceholders.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');

const PLACEHOLDERS = ['', '...', 'N/A'];

async function run() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    const placeholderQuery = {
      $or: [
        { productUrl: { $in: PLACEHOLDERS } },
        { productUrl: null },
        { productUrl: { $exists: false } },
      ],
    };

    const coupons = await Coupon.find(placeholderQuery).sort({ updatedAt: -1 }).lean();
    const seen = new Map(); // key: `${code}|${storeId}`
    let updated = 0;
    let removed = 0;

    for (const c of coupons) {
      const key = `${c.code}|${c.storeId}`;
      if (seen.has(key)) {
        await Coupon.findByIdAndDelete(c._id);
        removed++;
      } else {
        seen.set(key, true);
        await Coupon.findByIdAndUpdate(c._id, {
          productUrl: `__all_products__${c.code}`,
        });
        updated++;
      }
    }

    console.log(`Updated ${updated} coupon(s) with placeholder productUrl -> __all_products__{code}`);
    if (removed > 0) {
      console.log(`Removed ${removed} duplicate(s) (kept most recent per code+store).`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
