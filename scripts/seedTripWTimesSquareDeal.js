/**
 * Seed one Trip.com hotel deal near Times Square (W New York - Times Square).
 *
 * Usage:
 *   node scripts/seedTripWTimesSquareDeal.js
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

function buildPayload(productUrl, startDate, endDate) {
  const originalPrice = 209;
  const discountedPrice = 206;
  const savingsAmount = 3;
  const savingsPercentage = Number(((savingsAmount / originalPrice) * 100).toFixed(2)); // 1.44%

  return {
    title: 'W New York - Times Square - nightly deal',
    name: 'Trip.com New York - W New York Times Square nightly rate',
    description:
      'Stay near Times Square at W New York - Times Square from $206 per night (previously $209).',
    instructions:
      "1. Click 'Get Deal' to open Trip.com\n2. Confirm dates, guests, and room policy\n3. Select room and extras\n4. Complete booking on Trip.com",
    dealType: 'discount',
    discountType: 'percentage',
    discountValue: savingsPercentage,
    originalPrice,
    discountedPrice,
    currency: 'USD',
    priceUnit: 'per_night',
    savingsAmount,
    savingsPercentage,
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
    entityName: 'W New York - Times Square',
    entityLocation: 'Manhattan, New York, NY, US',
    entityTags: [
      'times-square',
      'broadway',
      'midtown-manhattan',
      'new-york-city',
      'trip-com',
      'hotel',
      'theater-district',
    ],
    tags: [
      'trip.com',
      'new york',
      'times square',
      'hotel deal',
      'midtown',
      'manhattan',
    ],
    highlights: [
      'Lounge',
      'Car rentals',
      'Bathtub',
      'Ideal location',
      'Gym',
      'Guest rating 8.2/5.0 (53 reviews)',
    ],
    features: [
      'Gym',
      'Bar',
      'Restaurant',
      'Car rentals',
      'Conference room',
      'Multi-function room',
      'Wi-Fi in public areas',
      'Fax/copying service',
    ],
    longDescription:
      "If you're traveling with children, this hotel is a strong family-friendly option with spacious suites and convenient access to Times Square attractions and dining. W New York - Times Square is located at 1567 Broadway, Manhattan, New York, NY 10036, United States. It is steps from Broadway and close to major subway lines, connecting travelers across Manhattan. The current tracked offer is $206 nightly versus a previous $209 reference price.",
  };
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
    const trip = await Store.findOne({
      $or: [{ slug: /^trip-com$/i }, { name: /^trip\.com$/i }, { name: /^trip\.com/i }, { url: /trip\.com/i }],
    }).lean();

    if (!trip) {
      console.error('Trip.com store not found. Run: node scripts/seedTripComStore.js');
      process.exit(1);
    }
    console.log('Store:', trip.name, trip._id);

    let siteId = trip.siteId || null;
    if (!siteId) {
      const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
      siteId = site?._id || null;
      if (siteId) {
        await Store.updateOne({ _id: trip._id }, { $set: { siteId } });
        console.log('Assigned siteId to Trip.com store (was missing)');
      }
    }

    let categoryId = trip.categoryId || null;
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
      console.error('No categoryId on Trip.com store and no Travel category found.');
      process.exit(1);
    }

    const startDate = new Date('2026-04-02T00:00:00.000Z');
    const endDate = new Date('2026-05-20T00:00:00.000Z');
    const payload = buildPayload('https://www.trip.com/w/iTHQ3cYj3U2', startDate, endDate);
    const userId = await findAdminUserId();

    const existing = await Deal.findOne({ name: payload.name, store: trip._id }).select('_id slug').lean();
    if (existing?._id) {
      await Deal.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...payload,
            categoryId,
            ...(siteId && { siteId }),
            ...(userId && { userId }),
          },
        }
      );
      const updated = await Deal.findById(existing._id).select('_id slug name discountedPrice originalPrice discountValue discountType').lean();
      console.log('Updated existing deal:', updated);
    } else {
      const doc = new Deal({
        ...payload,
        store: trip._id,
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
        originalPrice: doc.originalPrice,
        discountValue: doc.discountValue,
        discountType: doc.discountType,
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

