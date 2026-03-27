/**
 * Seed one Trip.com hotel deal near Times Square (NYC).
 *
 * Usage:
 *   node scripts/seedTripTimesSquareDeal.js
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
  const originalPrice = 156;
  const discountedPrice = 140;
  const savingsAmount = 16;
  const savingsPercentage = Number(((savingsAmount / originalPrice) * 100).toFixed(2));

  return {
    title: 'Motto by Hilton New York City Times Square - nightly deal',
    name: 'Trip.com New York - Motto by Hilton Times Square nightly rate',
    description:
      'Stay near Times Square at Motto by Hilton New York City Times Square for $140 per night, down from $156.',
    instructions:
      "1. Click 'Get Deal' to open Trip.com\n2. Confirm dates, guests, and room policy\n3. Select the best available room option for your trip\n4. Complete booking on Trip.com",
    dealType: 'discount',
    discountType: 'fixed',
    discountValue: savingsAmount,
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
    entityName: 'Motto by Hilton New York City Times Square',
    entityLocation: 'New York, NY, US',
    entityTags: [
      'times-square',
      'midtown-manhattan',
      'new-york-city',
      'hotel',
      'trip-com',
      'rockefeller-center',
      'broadway',
    ],
    tags: [
      'trip.com',
      'new york',
      'times square',
      'hotel deal',
      'city break',
      'midtown',
    ],
    highlights: [
      'Cafe',
      'American breakfast',
      'Great views',
      'Ideal location',
      'Bar',
      'On-site fitness center',
      'Guest rating 8.5/10 from 590 reviews',
    ],
    features: [
      'Gym',
      'Public parking',
      'Bar and restaurant',
      'Cafe',
      'Free WiFi in public areas',
      'Coworking spaces',
      'Pet-friendly rooms',
    ],
    longDescription:
      'Motto by Hilton New York City Times Square is in the heart of Midtown, walking distance to Times Square, Broadway, Rockefeller Center, and 5th Avenue shopping. This deal is structured as a per-night rate: $140 nightly versus a previous $156 reference price. Amenities include a gym, bar, cafe, coworking spaces, and easy access to major transit points like 49th Street subway and Grand Central.',
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

    const startDate = new Date('2026-04-01T00:00:00.000Z');
    const endDate = new Date('2026-05-10T00:00:00.000Z');
    const payload = buildPayload('https://www.trip.com/w/uzFXINrH3U2', startDate, endDate);
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
      const updated = await Deal.findById(existing._id).select('_id slug name discountedPrice originalPrice discountValue').lean();
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

