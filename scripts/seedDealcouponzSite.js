/**
 * Creates the dealcouponz.com site as the first tenant and assigns all existing
 * database records to it. Run this ONCE before deploying multi-site.
 *
 * Usage:
 *   node scripts/seedDealcouponzSite.js
 *   npm run seed:dealcouponz
 *
 * Requires: Site model to exist
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    const Site = require('../models/site');

    // 1. Create or get dealcouponz site
    let site = await Site.findOne({ slug: 'dealcouponz' });
    if (site) {
      console.log('Site dealcouponz already exists:', site._id);
    } else {
      site = await Site.create({
        name: 'DealCouponz',
        slug: 'dealcouponz',
        domains: ['dealcouponz.com', 'www.dealcouponz.com', 'localhost'],
        isActive: true,
      });
      console.log('Created site dealcouponz:', site._id);
    }

    const siteId = site._id;

    // 2. Add siteId to all per-site models (only where siteId is missing)
    // Uses raw collection updates - works even before siteId is in schema
    const modelPaths = [
      'store',
      'deal',
      'coupon',
      'user',
      'couponSubmission',
      'vote',
      'notification',
      'urlRedirect',
      'view',
      'interaction',
      'couponUsage',
      'campaign',
      'couponBoost',
      'visitor',
    ];

    for (const modelPath of modelPaths) {
      try {
        const Model = require(`../models/${modelPath}`);
        if (!Model?.collection) continue;

        const result = await Model.collection.updateMany(
          { $or: [{ siteId: { $exists: false } }, { siteId: null }] },
          { $set: { siteId } }
        );
        if (result.modifiedCount > 0) {
          console.log(`  ${modelPath}: assigned siteId to ${result.modifiedCount} records`);
        }
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          console.log(`  ${modelPath}: model not found, skipping`);
        } else {
          console.warn(`  ${modelPath}:`, err.message);
        }
      }
    }

    // 3. Categories: NO update — remain global
    console.log('\nCategories: unchanged (global)');

    console.log('\nDone. All per-site data is now under dealcouponz.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
