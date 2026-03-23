/**
 * Set Trendykool store (and its deals/coupons) to Fashion — not Travel.
 * Trendykool sells clothing; it was likely tagged Travel due to wording like "travelling" in the description.
 *
 * Usage:
 *   node scripts/fixTrendykoolCategory.js
 *
 * Env (optional):
 *   CATEGORY_SLUG=fashion     — target category slug (default: fashion)
 *   STORE_SLUG=trendykool     — store slug (default: trendykool)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/store');
const Category = require('../models/category');
const Deal = require('../models/deal');
const Coupon = require('../models/coupon');

const TARGET_CATEGORY_SLUG = process.env.CATEGORY_SLUG || 'fashion';
const STORE_MATCH = process.env.STORE_SLUG || 'trendykool';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    const category = await Category.findOne({
      slug: new RegExp(`^${TARGET_CATEGORY_SLUG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    }).lean();

    if (!category) {
      console.error(
        `Category with slug "${TARGET_CATEGORY_SLUG}" not found. Create it or set CATEGORY_SLUG to an existing slug (e.g. womens-fashion).`
      );
      process.exit(1);
    }

    const store = await Store.findOne({
      $or: [{ slug: STORE_MATCH }, { slug: new RegExp(`^${STORE_MATCH}$`, 'i') }, { name: /trendykool/i }],
    }).lean();

    if (!store) {
      console.error(`No store found for slug/name matching "${STORE_MATCH}" / Trendykool.`);
      process.exit(1);
    }

    console.log('Target category:', category.name, `(${category.slug})`, category._id.toString());
    console.log('Store:', store.name, `(${store.slug})`, store._id.toString());
    console.log('Previous store.categoryId:', store.categoryId?.toString() || '(none)');

    const catId = category._id;
    const storeId = store._id;

    const [storeRes, dealRes, couponRes] = await Promise.all([
      Store.updateOne({ _id: storeId }, { $set: { categoryId: catId, updatedAt: new Date() } }),
      Deal.updateMany({ store: storeId }, { $set: { categoryId: catId, updatedAt: new Date() } }),
      Coupon.updateMany({ storeId }, { $set: { categoryId: catId, updatedAt: new Date() } }),
    ]);

    console.log('\nUpdated:');
    console.log('  Store:', storeRes.modifiedCount === 1 ? 'yes' : 'no change or not found');
    console.log('  Deals:', dealRes.modifiedCount, 'documents');
    console.log('  Coupons:', couponRes.modifiedCount, 'documents');
    console.log('\nDone.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
