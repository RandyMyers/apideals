/**
 * Upsert Trip.com store landing page: Times Square
 *
 * Usage:
 *   node scripts/seedTripTimesSquareLanding.js
 *
 * Env:
 *   MONGO_URL | MONGODB_URI | MONGO_URI
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Site = require('../models/site');
const StoreLandingPage = require('../models/storeLandingPage');

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
      $or: [{ slug: /^trip-?com$/i }, { name: /^trip\.com$/i }, { url: /trip\.com/i }],
    })
      .select('_id name slug siteId')
      .lean();

    if (!trip) {
      console.error('Trip.com store not found. Run: node scripts/seedTripComStore.js');
      process.exit(1);
    }

    let siteId = trip.siteId || null;
    if (!siteId) {
      const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
      siteId = site?._id || null;
      if (siteId) {
        await Store.updateOne({ _id: trip._id }, { $set: { siteId } });
        console.log('Assigned siteId to Trip.com store (was missing)');
      }
    }

    const landingSlug = 'times-square';
    const landing = await StoreLandingPage.findOneAndUpdate(
      { storeId: trip._id, slug: landingSlug },
      {
        $set: {
          ...(siteId ? { siteId } : {}),
          storeId: trip._id,
          title: 'Times Square',
          slug: landingSlug,
          description:
            'Trip.com hotel deals near Times Square, Rockefeller Center, and Broadway in Midtown Manhattan.',
          seoTitle: 'Trip.com Times Square hotel deals | New York',
          seoDescription:
            'Browse active Trip.com hotel deals near Times Square, with easy access to Broadway and Midtown landmarks.',
          isActive: true,
          isPublished: true,
          offerTypes: ['deals'],
          entityType: 'hotel',
          entityLocation: 'New York, NY, US',
          entityTags: ['times-square', 'midtown-manhattan', 'new-york-city', 'broadway', 'rockefeller-center'],
          availableCountries: ['WORLDWIDE'],
          isWorldwide: true,
        },
      },
      { upsert: true, new: true }
    ).lean();

    console.log('Store:', trip.name, `(${trip.slug || 'no-slug'})`);
    console.log('Landing upserted:', {
      _id: landing._id,
      title: landing.title,
      slug: landing.slug,
      storeId: landing.storeId,
      offerTypes: landing.offerTypes,
      entityType: landing.entityType,
      entityLocation: landing.entityLocation,
    });
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();

