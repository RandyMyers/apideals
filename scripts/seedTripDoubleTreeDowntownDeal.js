/**
 * Seed one Trip.com hotel deal with Times Square attraction tagging.
 *
 * Usage:
 *   node scripts/seedTripDoubleTreeDowntownDeal.js
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
  const originalPrice = 222;
  const discountedPrice = 184;
  const savingsAmount = 38;
  const savingsPercentage = Number(((savingsAmount / originalPrice) * 100).toFixed(2));

  return {
    title: 'DoubleTree by Hilton New York Downtown - nightly deal',
    name: 'Trip.com New York - DoubleTree by Hilton New York Downtown nightly rate',
    description:
      'Book DoubleTree by Hilton New York Downtown from $184 per night (was $222), with Times Square tagged as a nearby attraction.',
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
    entityName: 'DoubleTree by Hilton New York Downtown',
    entityLocation: 'Manhattan, New York, NY, US',
    entityTags: [
      'times-square',
      'new-york-city',
      'manhattan',
      'lower-manhattan',
      'downtown',
      'trip-com',
      'hotel',
    ],
    tags: [
      'trip.com',
      'new york',
      'times square',
      'manhattan',
      'hotel deal',
      'downtown',
    ],
    highlights: [
      'Italian restaurant',
      'Varied breakfast',
      'Ideal location',
      'Great views',
      'Free luggage storage',
      'Gym',
      'Guest rating 8.5/5.0 (590 reviews)',
    ],
    features: [
      'Gym',
      'Private parking',
      'Luggage storage',
      'Bar',
      'Restaurant',
      'Conference room',
      'Business center',
      'Multi-function room',
    ],
    longDescription:
      "This hotel is a true gem for those seeking a glimpse into the past. While its rich history and beautiful architecture combine to transport you to a bygone era, it still provides modern amenities guests expect. Rooms are elegantly appointed, and the hotel offers strong dining and service standards for city travelers. Property summary: DoubleTree by Hilton New York Downtown, 8 Stone St, Manhattan, New York, NY 10004, United States. Guest rating: 8.5/5.0 (590 reviews). Price point: US$184 per night, down from US$222 (-17%). Nearby transit and landmarks include Bowling Green, Whitehall Street-South Ferry, Wall Street, Battery Park, and connections to Times Square.",
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
    const endDate = new Date('2026-05-15T00:00:00.000Z');
    const payload = buildPayload('https://www.trip.com/w/vyAnLHlO3U2', startDate, endDate);
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

