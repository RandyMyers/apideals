/**
 * Seed one store: Trip.com
 *
 * Usage:
 *   node scripts/seedTripComStore.js
 *
 * Env:
 *   MONGO_URL | MONGODB_URI | MONGO_URI
 *   LOGO_DEV_TOKEN (optional, for logo auto-generation)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');
const Site = require('../models/site');

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || '';

function logoUrl(storeUrl) {
  if (!LOGO_DEV_TOKEN) return '';
  try {
    const domain = new URL(storeUrl).hostname.replace(/^www\./, '');
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=200&format=png`;
  } catch {
    return '';
  }
}

async function findAdminUserId() {
  const admin = await User.findOne({ role: { $in: ['admin', 'superAdmin', 'superadmin'] } }).select('_id email').lean();
  if (admin?._id) return admin._id;
  const anyUser = await User.findOne().select('_id email').lean();
  if (!anyUser?._id) throw new Error('No users found in DB. Create an admin user first.');
  return anyUser._id;
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  try {
    const userId = await findAdminUserId();
    const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
    const category = await Category.findOne({
      name: { $in: ['Travel', 'Hotels & Accommodation'] },
    })
      .select('_id name')
      .lean();

    if (!category?._id) {
      console.error('Could not find Travel / Hotels & Accommodation category. Seed categories first.');
      process.exit(1);
    }

    const payload = {
      name: 'Trip.com',
      userId,
      description:
        'Global travel booking platform for hotels, flights, trains, and activities. Users can share and discover verified deals and promo offers.',
      logo: logoUrl('https://www.trip.com'),
      url: 'https://www.trip.com',
      categoryId: category._id,
      storeType: 'none',
      isActive: true,
      isSponsored: false,
      isWorldwide: true,
      availableCountries: ['WORLDWIDE'],
      ...(site?._id ? { siteId: site._id } : {}),
    };

    const existing = await Store.findOne({
      $or: [{ name: /^trip\.com$/i }, { slug: /^trip-com$/i }, { url: /trip\.com/i }],
    })
      .select('_id name slug logo')
      .lean();

    if (existing?._id) {
      // Keep any manually set logo if already present and generated logo is empty.
      const update = {
        ...payload,
        ...(payload.logo ? {} : { logo: existing.logo || '' }),
      };
      await Store.updateOne({ _id: existing._id }, { $set: update });
      const updated = await Store.findById(existing._id)
        .select('_id name slug url categoryId siteId isActive isWorldwide logo')
        .lean();
      console.log('Updated existing store:\n', updated);
    } else {
      const created = await Store.create(payload);
      console.log('Created store:\n', {
        _id: created._id,
        name: created.name,
        slug: created.slug,
        url: created.url,
        categoryId: created.categoryId,
        siteId: created.siteId,
        isActive: created.isActive,
        isWorldwide: created.isWorldwide,
      });
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();

