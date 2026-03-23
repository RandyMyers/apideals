/**
 * List all stores that have at least one coupon and/or deal in the database.
 * Shows counts per store (total and active where applicable).
 *
 * Usage:
 *   node scripts/listStoresWithOffers.js
 *
 * Requires MONGO_URL in .env (same as other server scripts).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    const [couponByStore, dealByStore, couponActiveByStore, dealActiveByStore] = await Promise.all([
      Coupon.aggregate([
        { $match: { storeId: { $exists: true, $ne: null } } },
        { $group: { _id: '$storeId', total: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: { store: { $exists: true, $ne: null } } },
        { $group: { _id: '$store', total: { $sum: 1 } } },
      ]),
      Coupon.aggregate([
        { $match: { storeId: { $exists: true, $ne: null }, isActive: true } },
        { $group: { _id: '$storeId', active: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: { store: { $exists: true, $ne: null }, isActive: true } },
        { $group: { _id: '$store', active: { $sum: 1 } } },
      ]),
    ]);

    const couponMap = new Map(couponByStore.map((r) => [String(r._id), r.total]));
    const dealMap = new Map(dealByStore.map((r) => [String(r._id), r.total]));
    const couponActiveMap = new Map(couponActiveByStore.map((r) => [String(r._id), r.active]));
    const dealActiveMap = new Map(dealActiveByStore.map((r) => [String(r._id), r.active]));

    const storeIdSet = new Set([
      ...couponMap.keys(),
      ...dealMap.keys(),
    ]);

    const storeIds = [...storeIdSet].map((id) => new mongoose.Types.ObjectId(id));

    const stores = await Store.find({ _id: { $in: storeIds } })
      .select('name slug isActive')
      .sort({ name: 1 })
      .lean();

    console.log('═'.repeat(100));
    console.log('Stores with coupons and/or deals');
    console.log('═'.repeat(100));
    console.log(
      [
        'Store name'.padEnd(36),
        'Slug'.padEnd(28),
        'Coupons (act)'.padEnd(14),
        'Deals (act)'.padEnd(12),
        'Active store',
      ].join('  ')
    );
    console.log('-'.repeat(100));

    let totalCoupons = 0;
    let totalDeals = 0;
    let totalActiveCoupons = 0;
    let totalActiveDeals = 0;

    for (const s of stores) {
      const id = String(s._id);
      const c = couponMap.get(id) || 0;
      const d = dealMap.get(id) || 0;
      const ca = couponActiveMap.get(id) || 0;
      const da = dealActiveMap.get(id) || 0;
      totalCoupons += c;
      totalDeals += d;
      totalActiveCoupons += ca;
      totalActiveDeals += da;

      console.log(
        [
          (s.name || '').slice(0, 35).padEnd(36),
          (s.slug || '—').slice(0, 27).padEnd(28),
          `${c} (${ca})`.padEnd(14),
          `${d} (${da})`.padEnd(12),
          s.isActive === false ? 'no' : 'yes',
        ].join('  ')
      );
    }

    console.log('-'.repeat(100));
    console.log(`Rows: ${stores.length} stores`);
    console.log(
      `Totals — coupons: ${totalCoupons} (${totalActiveCoupons} active), deals: ${totalDeals} (${totalActiveDeals} active)`
    );
    console.log('═'.repeat(100));

    const orphanCouponStores = [...couponMap.keys()].filter((id) => !stores.some((s) => String(s._id) === id));
    const orphanDealStores = [...dealMap.keys()].filter((id) => !stores.some((s) => String(s._id) === id));
    if (orphanCouponStores.length || orphanDealStores.length) {
      console.log('\n⚠️  Orphan references (coupon/deal points to missing store):');
      if (orphanCouponStores.length) {
        console.log('  Coupon storeIds not found in Store:', orphanCouponStores.join(', '));
      }
      if (orphanDealStores.length) {
        console.log('  Deal store refs not found in Store:', orphanDealStores.join(', '));
      }
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
