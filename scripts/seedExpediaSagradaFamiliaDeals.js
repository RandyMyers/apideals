/**
 * Seed Expedia hotel deals near Sagrada Familia (Barcelona).
 *
 * Purpose:
 * - Quickly populate travel deals so new store landing pages can be tested
 * - Uses entity fields for filtered landing pages:
 *   entityScope/entityType/entityLocation/entityTags
 *
 * Usage:
 *   node scripts/seedExpediaSagradaFamiliaDeals.js
 *
 * Notes:
 * - Idempotent by (name + store)
 * - Product URL uses store.url unless a specific deep-link is provided later
 * - Images can be updated later from admin (as requested)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');
const Site = require('../models/site');
const StoreLandingPage = require('../models/storeLandingPage');

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

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
    priceUnit: 'per_stay',
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
    entityName: 'Sercotel Rosellon',
    entityLocation: 'Barcelona, ES',
    entityTags: [
      'barcelona',
      'sagrada-familia',
      'eixample',
      'hotel',
      'expedia',
      'attraction-nearby',
    ],
    tags: [
      'hotel',
      'barcelona',
      'sagrada-familia',
      'expedia',
      'city-break',
      'europe-travel',
    ],
    highlights: [
      '2 min walk to Sagrada Familia',
      'Highly rated location for exploring Barcelona',
      'Top-rated breakfast and rooftop terrace',
      'Great for couples',
    ],
    features: [
      'Free WiFi',
      'Rooftop terrace',
      'Self parking available',
      'On-site car rental',
      'Coffee shop',
    ],
  };

  return [
    {
      ...common,
      title: 'Sercotel Rosellon - Basic Room near Sagrada Familia',
      name: 'Expedia Barcelona Sagrada Familia - Sercotel Rosellon Basic Room',
      description:
        'Book the Basic Room at Sercotel Rosellon and stay steps from Sagrada Familia. Great value option for 2 travelers.',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Confirm your travel dates and room availability\n3. Choose Basic Room offer shown for your dates\n4. Complete booking on Expedia",
      originalPrice: 203,
      discountedPrice: 187,
      savingsAmount: 16,
      savingsPercentage: 7.88,
      discountValue: 16,
      longDescription:
        'Sercotel Rosellon is one of the most convenient hotel options for Sagrada Familia visits. This Basic Room option is positioned as a low-price deal for travelers who want a central location with rooftop terrace access and easy transport links.',
    },
    {
      ...common,
      title: 'Sercotel Rosellon - Classic Double Room near Sagrada Familia',
      name: 'Expedia Barcelona Sagrada Familia - Sercotel Rosellon Classic Double Room',
      description:
        'Classic Double Room at Sercotel Rosellon with excellent location and strong guest ratings for a 1-night stay.',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Check dates and occupancy details\n3. Select Classic Double Room option\n4. Complete booking on Expedia",
      originalPrice: 224,
      discountedPrice: 206,
      savingsAmount: 18,
      savingsPercentage: 8.04,
      discountValue: 18,
      longDescription:
        'This Classic Double Room offer keeps you near Sagrada Familia with easy access to Avinguda Diagonal and Passeig de Gracia. A practical option for couples looking for location, comfort, and competitive rates.',
    },
    {
      ...common,
      title: 'Sercotel Rosellon - Standard Room near Sagrada Familia',
      name: 'Expedia Barcelona Sagrada Familia - Sercotel Rosellon Standard Room',
      description:
        'Standard Room availability at Sercotel Rosellon for travelers seeking a reliable nearby hotel option.',
      instructions:
        "1. Click 'Get Deal' to open Expedia\n2. Verify room policy and restrictions\n3. Choose Standard Room\n4. Complete booking on Expedia",
      originalPrice: 206,
      discountedPrice: 206,
      savingsAmount: 0,
      savingsPercentage: 0,
      discountValue: 0,
      longDescription:
        'This Standard Room listing is included as an alternative availability option near Sagrada Familia. Pricing may shift with demand; keep this landing page URL as your stable backlink and the latest options will keep updating here.',
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

    const userId = await findAdminUserId();
    const startDate = new Date();
    const endDate = daysFromNow(45);
    const deals = buildDeals(startDate, endDate, expedia.url || 'https://www.expedia.com');

    let created = 0;
    let skipped = 0;

    for (const payload of deals) {
      const exists = await Deal.findOne({ name: payload.name, store: expedia._id }).select('_id').lean();
      if (exists) {
        console.log('Skip (exists):', payload.name);
        skipped += 1;
        continue;
      }

      const doc = new Deal({
        ...payload,
        store: expedia._id,
        categoryId,
        ...(siteId && { siteId }),
        ...(userId && { userId }),
      });
      await doc.save();
      console.log('Created:', doc.name, '->', doc.slug);
      created += 1;
    }

    // Stable public URL: /stores/expedia/sagrada-familia → API GET /api/v1/store/expedia/landing/sagrada-familia
    const landingSlug = 'sagrada-familia';
    await StoreLandingPage.findOneAndUpdate(
      { storeId: expedia._id, slug: landingSlug },
      {
        $set: {
          siteId: siteId || undefined,
          storeId: expedia._id,
          title: 'Hotels & stays near Sagrada Familia (Barcelona)',
          slug: landingSlug,
          description:
            'Latest Expedia hotel deals near Sagrada Familia and the Eixample. Filtered by location and tags for stable backlinks.',
          seoTitle: 'Expedia deals near Sagrada Familia | Barcelona',
          seoDescription: 'Browse active hotel deals near Sagrada Familia on Expedia.',
          isActive: true,
          isPublished: true,
          offerTypes: ['deals'],
          entityType: 'hotel',
          entityLocation: 'Barcelona, ES',
          entityTags: ['sagrada-familia', 'barcelona', 'eixample'],
        },
      },
      { upsert: true, new: true }
    );
    console.log(`\nStore landing page upserted: slug=${landingSlug}`);

    console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
    console.log('Images intentionally left for admin update.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();

