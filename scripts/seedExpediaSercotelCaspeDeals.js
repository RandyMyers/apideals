/**
 * Seed Expedia hotel deals: Sercotel Caspe (Barcelona).
 *
 * Usage:
 *   node scripts/seedExpediaSercotelCaspeDeals.js
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

function buildDeals(startDate, endDate, productUrl) {
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
    entityName: 'Sercotel Caspe',
    entityLocation: 'Barcelona, ES',
    entityTags: [
      'barcelona',
      'sercotel-caspe',
      'eixample',
      'hotel',
      'expedia',
      'couples',
      'fitness-center',
      'top-breakfast',
    ],
    tags: ['hotel', 'barcelona', 'expedia', 'city-break', 'europe-travel'],
    highlights: [
      'Loved by couples with multiple 10/10 ratings',
      'Top-rated breakfast',
      'On-site fitness center (rare find)',
      'Easy to get around for exploring Barcelona',
      'Wonderful review score: 9.0/10 from 1,000 reviews',
      '4-night trip window: Apr 2 to Apr 6',
    ],
    features: [
      'Buffet breakfast available',
      'Self-parking available',
      'On-site car rental',
      'Dogs and cats allowed',
      'Restaurant',
      'Free WiFi',
      '9-minute walk to Arc de Triomf',
      '14-minute walk to Sagrada Familia',
    ],
  };

  return [
    {
      ...common,
      title: 'Sercotel Caspe - Classic Double Room nightly deal',
      name: 'Expedia Barcelona - Sercotel Caspe Classic Double Room nightly rate',
      description: 'Classic Double Room at Sercotel Caspe for $198 per night (Apr 2 → Apr 6).',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Confirm dates (Apr 2 - Apr 6) and travelers\n3. Select Classic Double Room and review cancellation + extras\n4. Complete booking on Expedia",
      originalPrice: 244,
      discountedPrice: 198,
      savingsAmount: 46,
      savingsPercentage: Number(((46 / 244) * 100).toFixed(2)),
      discountValue: 46,
      longDescription:
        'Classic Double Room at Sercotel Caspe in Barcelona. Snapshot pricing showed $198 nightly with a current total of $955 (taxes and fees included) for Apr 2 to Apr 6, down from a previous total reference of $1,001.',
    },
    {
      ...common,
      title: 'Sercotel Caspe - Superior Room nightly deal',
      name: 'Expedia Barcelona - Sercotel Caspe Superior Room nightly rate',
      description: 'Superior Room at Sercotel Caspe for $220 per night (Apr 2 → Apr 6).',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Confirm dates (Apr 2 - Apr 6) and travelers\n3. Select Superior Room and review cancellation + extras\n4. Complete booking on Expedia",
      originalPrice: 271,
      discountedPrice: 220,
      savingsAmount: 51,
      savingsPercentage: Number(((51 / 271) * 100).toFixed(2)),
      discountValue: 51,
      longDescription:
        'Superior Room at Sercotel Caspe in Barcelona. Snapshot pricing showed $220 nightly with a current total of $1,054 (taxes and fees included) for Apr 2 to Apr 6, down from a previous total reference of $1,105.',
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
      const category = await Category.findOne({ name: { $in: ['Travel', 'Hotels & Accommodation'] } })
        .select('_id name')
        .lean();
      categoryId = category?._id || null;
      if (category) console.log('Category selected:', category.name, category._id);
    }
    if (!categoryId) {
      console.error('No categoryId on Expedia store and no Travel category found.');
      process.exit(1);
    }

    const userId = await findAdminUserId();
    const startDate = new Date('2026-04-02T00:00:00.000Z');
    const endDate = new Date('2026-04-06T00:00:00.000Z');
    const deals = buildDeals(startDate, endDate, expedia.url || 'https://www.expedia.com');

    let created = 0;
    let updated = 0;

    // Delete the Classic Twin Room seed (no longer in latest snapshot)
    const twinDelete = await Deal.deleteOne({
      store: expedia._id,
      name: 'Expedia Barcelona - Sercotel Caspe Classic Twin Room nightly rate',
    });
    if (twinDelete.deletedCount) {
      console.log('Deleted:', 'Expedia Barcelona - Sercotel Caspe Classic Twin Room nightly rate');
    }

    for (const payload of deals) {
      const existing = await Deal.findOne({ name: payload.name, store: expedia._id }).select('_id').lean();
      if (existing?._id) {
        // Preserve uploaded images (featured + gallery) by explicitly carrying them over.
        const existingMedia = await Deal.findById(existing._id).select('imageUrl imageGallery').lean();
        await Deal.updateOne(
          { _id: existing._id },
          {
            $set: {
              ...payload,
              categoryId,
              ...(siteId && { siteId }),
              ...(userId && { userId }),
              ...(existingMedia?.imageUrl ? { imageUrl: existingMedia.imageUrl } : {}),
              ...(Array.isArray(existingMedia?.imageGallery) ? { imageGallery: existingMedia.imageGallery } : {}),
            },
          }
        );
        const after = await Deal.findById(existing._id).select('_id slug name discountedPrice originalPrice discountValue startDate endDate imageUrl imageGallery').lean();
        console.log('Updated:', after);
        updated += 1;
      } else {
        const doc = new Deal({
          ...payload,
          store: expedia._id,
          categoryId,
          ...(siteId && { siteId }),
          ...(userId && { userId }),
        });
        await doc.save();
        console.log('Created:', { _id: doc._id, slug: doc.slug, name: doc.name, discountedPrice: doc.discountedPrice });
        created += 1;
      }
    }

    console.log(`\nDone. Created ${created}, updated ${updated}.`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();

