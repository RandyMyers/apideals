/**
 * Delete and reseed Expedia deals for Hotel ILUNION Bel Art (Barcelona).
 *
 * Usage:
 *   node scripts/seedExpediaIlunionBelArtDeal.js
 *
 * Env:
 *   MONGO_URL | MONGODB_URI | MONGO_URI
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');
const Site = require('../models/site');

async function findAdminUserId() {
  const admin = await User.findOne({ role: { $in: ['admin', 'superAdmin', 'superadmin'] } }).select('_id').lean();
  if (admin?._id) return admin._id;
  const anyUser = await User.findOne().select('_id').lean();
  return anyUser?._id || null;
}

function buildPayloads(productUrl) {
  const startDate = new Date('2026-03-26T00:00:00.000Z');
  const endDate = new Date('2026-04-01T00:00:00.000Z');

  const common = {
    dealType: 'discount',
    discountType: 'fixed',
    currency: 'USD',
    priceUnit: 'per_night',
    startDate,
    endDate,
    maxUsage: 1000,
    isActive: true,
    isPublished: true,
    isWorldwide: true,
    availableCountries: ['WORLDWIDE'],
    productUrl,
    entityScope: 'entity',
    entityType: 'hotel',
    entityName: 'Hotel ILUNION Bel Art',
    entityLocation: 'Barcelona, ES',
    entityTags: [
      'barcelona',
      'sagrada-familia',
      'hotel-ilunion-bel-art',
      'hotel',
      'expedia',
      'couples',
      'garage-parking',
    ],
    tags: ['hotel', 'barcelona', 'expedia', 'sagrada-familia', 'travel-deal'],
    highlights: [
      'Loved by couples with multiple 10/10 ratings',
      'Top-rated breakfast',
      'Garage parking available (rare in this area)',
      'Easy location for getting around Barcelona',
      'Excellent review score: 8.8/10 from 1,005 reviews',
      '6-night trip window: Mar 26 to Apr 1',
    ],
    features: [
      'Buffet breakfast available',
      'Garage parking available',
      'On-site car rental',
      'Pets allowed (fee applies)',
      'Buffet restaurant',
      'Free WiFi',
      '11-minute walk to Sagrada Familia',
    ],
  };

  return [
    {
      ...common,
      title: 'Hotel ILUNION Bel Art - Standard Double Room nightly deal',
      name: 'Expedia Barcelona - ILUNION Bel Art Standard Double Room nightly rate',
      description: 'Standard Double Room at Hotel ILUNION Bel Art for $121 per night (6-night search window).',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Confirm stay dates (Mar 26 - Apr 1) and travelers\n3. Select Standard Double Room and review cancellation options\n4. Complete booking on Expedia",
      discountValue: 311,
      originalPrice: 1239,
      discountedPrice: 121,
      savingsAmount: 311,
      savingsPercentage: Number(((311 / 1239) * 100).toFixed(2)),
      longDescription:
        'Standard Double Room at Hotel ILUNION Bel Art with a shown nightly rate of $121, based on a 6-night search from Mar 26 to Apr 1. The snapshot showed a previous total of $1,239 and current total of $928.',
    },
    {
      ...common,
      title: 'Hotel ILUNION Bel Art - Double Room (Pet friendly) nightly deal',
      name: 'Expedia Barcelona - ILUNION Bel Art Double Room Pet Friendly nightly rate',
      description: 'Pet-friendly Double Room at Hotel ILUNION Bel Art for $150 per night (6-night search window).',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Confirm stay dates (Mar 26 - Apr 1) and travelers\n3. Select Double Room, Pet friendly and review cancellation options\n4. Complete booking on Expedia",
      discountValue: 385,
      originalPrice: 1504,
      discountedPrice: 150,
      savingsAmount: 385,
      savingsPercentage: Number(((385 / 1504) * 100).toFixed(2)),
      longDescription:
        'Pet-friendly Double Room at Hotel ILUNION Bel Art with a shown nightly rate of $150, based on a 6-night search from Mar 26 to Apr 1. The snapshot showed a previous total of $1,504 and current total of $1,119.',
    },
  ];
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
    const expedia = await Store.findOne({
      $or: [{ slug: /^expedia$/i }, { name: /^expedia$/i }, { name: /expedia/i }],
    }).lean();

    if (!expedia) {
      console.error('Expedia store not found. Create/seed the store first, then rerun.');
      process.exit(1);
    }
    console.log('Store:', expedia.name, expedia._id);

    let siteId = expedia.siteId || null;
    if (!siteId) {
      const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
      siteId = site?._id || null;
      if (siteId) {
        await Store.updateOne({ _id: expedia._id }, { $set: { siteId } });
        console.log('Assigned siteId to Expedia store (was missing)');
      }
    }

    let categoryId = expedia.categoryId || null;
    if (!categoryId) {
      const category = await Category.findOne({
        name: { $in: ['Travel', 'Hotels & Accommodation'] },
      })
        .select('_id name')
        .lean();
      categoryId = category?._id || null;
      if (category) console.log('Category selected:', category.name, category._id);
    }
    if (!categoryId) {
      console.error('No categoryId on Expedia store and no Travel category found.');
      process.exit(1);
    }

    const payloads = buildPayloads(expedia.url || 'https://www.expedia.com');
    const userId = await findAdminUserId();

    const deleteResult = await Deal.deleteMany({
      store: expedia._id,
      entityName: 'Hotel ILUNION Bel Art',
    });
    console.log('Deleted old ILUNION Bel Art deals:', deleteResult.deletedCount);

    for (const payload of payloads) {
      const doc = new Deal({
        ...payload,
        store: expedia._id,
        categoryId,
        ...(siteId && { siteId }),
        ...(userId && { userId }),
      });
      await doc.save();
      console.log('Created deal:', {
        _id: doc._id,
        slug: doc.slug,
        name: doc.name,
        discountedPrice: doc.discountedPrice,
        maxUsage: doc.maxUsage,
      });
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
