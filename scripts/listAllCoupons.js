/**
 * List all coupons in the database and diagnose why some might not show in admin.
 * Run: node server/scripts/listAllCoupons.js
 *
 * Checks: total count, createdAt, isPublished, isActive, storeId validity, etc.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');
const Store = require('../models/store');

async function run() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');
    console.log('='.repeat(70));
    console.log('ALL COUPONS IN DATABASE');
    console.log('='.repeat(70));

    const total = await Coupon.countDocuments({});
    console.log(`\nTotal coupons: ${total}\n`);

    if (total === 0) {
      console.log('No coupons in database.');
      process.exit(0);
    }

    // Get all coupons sorted by createdAt desc (newest first)
    const coupons = await Coupon.find({})
      .sort({ createdAt: -1 })
      .select('_id code title createdAt isPublished isActive endDate storeId categoryId userId')
      .lean();

    // Get valid store IDs for reference
    const storeIds = await Store.find({}).select('_id').lean();
    const validStoreIds = new Set(storeIds.map((s) => s._id.toString()));

    console.log('Coupons (newest first):\n');
    console.log(
      'ID'.padEnd(26) +
        'Code'.padEnd(18) +
        'Created'.padEnd(22) +
        'Published'.padEnd(9) +
        'Active'.padEnd(9) +
        'StoreId'.padEnd(12) +
        'StoreValid'
    );
    console.log('-'.repeat(110));

    const couponsFrom14th = [];
    const unpublished = [];
    const inactive = [];
    const invalidStore = [];

    coupons.forEach((c) => {
      const created = c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : 'N/A';
      const storeIdStr = c.storeId ? c.storeId.toString() : 'null';
      const storeValid = c.storeId ? (validStoreIds.has(storeIdStr) ? 'yes' : 'NO') : 'n/a';

      if (c.createdAt) {
        const d = new Date(c.createdAt);
        if (d.getDate() === 14) {
          couponsFrom14th.push(c);
        }
      }
      if (c.isPublished !== true) unpublished.push(c);
      if (c.isActive !== true) inactive.push(c);
      if (c.storeId && !validStoreIds.has(storeIdStr)) invalidStore.push(c);

      const title = (c.title || c.code || 'N/A').slice(0, 15);
      console.log(
        String(c._id).padEnd(26) +
          (c.code || '-').slice(0, 16).padEnd(18) +
          created.padEnd(22) +
          String(c.isPublished).padEnd(9) +
          String(c.isActive).padEnd(9) +
          storeIdStr.slice(-6).padEnd(12) +
          storeValid
      );
    });

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total coupons: ${total}`);
    console.log(`Coupons created on 14th of any month: ${couponsFrom14th.length}`);
    console.log(`Unpublished (isPublished !== true): ${unpublished.length}`);
    console.log(`Inactive (isActive !== true): ${inactive.length}`);
    console.log(`Invalid storeId (store not in DB): ${invalidStore.length}`);

    console.log('\nAdmin Manage Coupons uses: GET /coupons/all?admin=true');
    console.log('  -> Query is {} (empty) when admin=true, so ALL coupons should be returned.');
    console.log('  -> No limit is applied on the server.');

    if (couponsFrom14th.length > 0) {
      console.log('\n--- Coupons from 14th ---');
      couponsFrom14th.forEach((c) => {
        console.log(
          `  ${c._id} | ${c.code || '-'} | ${c.title || '-'} | Created: ${c.createdAt} | isPublished: ${c.isPublished} | isActive: ${c.isActive}`
        );
      });
    }

    if (unpublished.length > 0) {
      console.log('\n--- Unpublished coupons (first 5) ---');
      unpublished.slice(0, 5).forEach((c) => {
        console.log(
          `  ${c._id} | ${c.code || '-'} | isPublished: ${c.isPublished} | isActive: ${c.isActive}`
        );
      });
    }

    if (invalidStore.length > 0) {
      console.log('\n--- Coupons with invalid storeId ---');
      invalidStore.forEach((c) => {
        console.log(`  ${c._id} | storeId: ${c.storeId} (store not in DB)`);
      });
    }

    console.log('\n');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
