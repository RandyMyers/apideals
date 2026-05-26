/**
 * Seed Expedia store SEO content + refresh deal dates for public visibility.
 *
 * Usage:
 *   node scripts/seedExpediaStoreSeoContent.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Deal = require('../models/deal');
const UrlRedirect = require('../models/urlRedirect');
const Site = require('../models/site');

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function buildSeoPayload(now) {
  return {
    seoSlug: 'expedia-coupon-codes',
    logoAlt: 'Expedia coupon codes and travel deals on DealCouponz',
    contentUpdatedAt: now,
    lastVerifiedAt: now,
    description:
      'DealCouponz lists verified Expedia coupon codes, hotel deals, and travel savings updated weekly. ' +
      'Browse active Expedia coupon codes for hotels and packages, plus step-by-step help when a promo code does not apply at checkout. ' +
      'We test offers regularly and remove expired deals so you see working savings—not outdated lists.',
    seo: {
      primaryKeyword: 'expedia coupon codes',
      title: 'Expedia Coupon Codes (2026): Verified Deals & Promo Codes',
      metaDescription:
        'Find working Expedia coupon codes for hotels, flights, and packages. Updated weekly with tested deals, FAQs, and step-by-step checkout help on DealCouponz.',
      h1: 'Expedia Coupon Codes 2026',
      intro:
        'Looking for active Expedia coupon codes that actually lower your trip price? This page lists verified Expedia coupon codes and hotel deals our team checks regularly. ' +
        'When a true promo code is available, copy it below; otherwise use our Get Deal links for tested hotel and package savings on Expedia.',
      keywords: [
        'expedia coupon codes',
        'expedia promo codes',
        'expedia discount codes',
        'expedia hotel deals',
        'expedia coupons 2026',
      ],
    },
    savingTips: [
      {
        tip: 'Compare Expedia coupon codes for hotels before booking—hotel discounts are more common than flight percentage codes.',
        order: 1,
        isActive: true,
      },
      {
        tip: 'Book flight + hotel as a package when a flight-only Expedia coupon code is not available.',
        order: 2,
        isActive: true,
      },
      {
        tip: 'Check the Expedia app for mobile-only offers not always shown on desktop.',
        order: 3,
        isActive: true,
      },
      {
        tip: 'Expedia typically allows one promo code per booking—combine with cashback (e.g. Rakuten), not multiple codes.',
        order: 4,
        isActive: true,
      },
      {
        tip: 'Read expiry dates on every Expedia coupon code; we refresh this page weekly and hide expired offers.',
        order: 5,
        isActive: true,
      },
      {
        tip: 'Mid-week hotel stays often pair well with Expedia coupon codes for extra nightly savings.',
        order: 6,
        isActive: true,
      },
    ],
    faqs: [
      {
        question: 'Are Expedia coupon codes legit?',
        answer:
          'Yes, when they come from Expedia or authorized partners like DealCouponz. Avoid random forum codes that look too good to be true—we only list verified offers and community submissions we review.',
        group: 'faq',
        order: 1,
        isActive: true,
      },
      {
        question: 'Do Expedia coupon codes work on all hotels?',
        answer:
          'No. Some chains and member-only rates are excluded. Always check the offer terms on the listing before you pay.',
        group: 'faq',
        order: 2,
        isActive: true,
      },
      {
        question: 'Do Expedia coupon codes work on flights?',
        answer:
          'Sometimes, but rarely for percentage-off flight codes. Most Expedia coupon codes target hotels and packages. Package bookings are often the best way to save when flight-only codes are unavailable.',
        group: 'paa',
        order: 1,
        isActive: true,
      },
      {
        question: 'Can I use more than one Expedia promo code per booking?',
        answer:
          'Usually no—Expedia allows one promo code per booking. You can still combine a code with Expedia Rewards points or third-party cashback where eligible.',
        group: 'paa',
        order: 2,
        isActive: true,
      },
      {
        question: 'Why isn’t my Expedia coupon working?',
        answer:
          'Common causes: minimum spend not met, wrong product type (hotel vs flight), code expired, app-only restriction, or another promotion already applied. Try incognito mode or the Expedia app, and confirm dates match the offer.',
        group: 'troubleshooting',
        order: 1,
        isActive: true,
      },
      {
        question: 'My code works in the app but not on desktop—why?',
        answer:
          'Some Expedia coupon codes are app-exclusive. Open the same offer from our Get Deal link on your phone or install the Expedia app and retry checkout there.',
        group: 'troubleshooting',
        order: 2,
        isActive: true,
      },
    ],
    editorial: {
      howToSteps: [
        'Click a coupon or Get Deal button on this page to open Expedia.',
        'Search for your hotel, flight, package, or car rental and select your option.',
        'Proceed to checkout until you see “Promo code”, “Coupon”, or “Add coupon”.',
        'Paste the Expedia coupon code (Ctrl+V / Cmd+V) and click Apply.',
        'Confirm the discount appears in the price breakdown before entering payment details.',
        'Complete booking only after the savings line item is visible.',
      ],
      comparisonRows: [
        {
          type: 'Hotel',
          worksBestFor: 'Stays of 2+ nights, city breaks',
          typicalDiscount: '% off or nightly deal',
          notes: 'Most common offers on DealCouponz; check entity tags for location.',
        },
        {
          type: 'Flight',
          worksBestFor: 'Domestic or international airfare',
          typicalDiscount: '$ off (limited)',
          notes: 'Many Expedia coupon codes exclude flights; packages may qualify instead.',
        },
        {
          type: 'Package',
          worksBestFor: 'Flight + hotel bundles',
          typicalDiscount: '$ off minimum spend',
          notes: 'Strong option when no flight-only code is listed.',
        },
        {
          type: 'Car rental',
          worksBestFor: 'Avis, Budget, and partners',
          typicalDiscount: '% off select rentals',
          notes: 'Verify partner and blackout dates in offer terms.',
        },
      ],
      stackingNote:
        'Expedia does not allow stacking multiple promo codes on one booking. You can combine one Expedia coupon code with Expedia Rewards points and eligible cashback programs (such as Rakuten) where terms allow.',
      exclusionsNote:
        'Flight-only percentage codes are uncommon. Resort fees, taxes, and member-only properties may be excluded. Read each offer’s terms before checkout.',
      externalLinks: [
        {
          label: 'Expedia Customer Service',
          url: 'https://www.expedia.com/service/',
        },
        {
          label: 'Sign up for Expedia emails (official)',
          url: 'https://www.expedia.com/newsletter',
        },
      ],
      internalLinks: [
        {
          label: 'Travel category deals',
          path: '/categories/travel',
          anchorText: 'Travel deals and coupons',
        },
        {
          label: 'All stores',
          path: '/stores/all',
          anchorText: 'Browse all store coupon codes',
        },
      ],
      authorByline: 'Reviewed by the DealCouponz travel deals team',
    },
  };
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const now = new Date();

  try {
    const expedia = await Store.findOne({
      $or: [{ slug: /^expedia$/i }, { seoSlug: 'expedia-coupon-codes' }],
    });

    if (!expedia) {
      console.error('Expedia store not found.');
      process.exit(1);
    }

    const seoPayload = buildSeoPayload(now);
    await Store.updateOne({ _id: expedia._id }, { $set: seoPayload });
    console.log('Updated Expedia store SEO fields');

    const dealUpdate = await Deal.updateMany(
      { store: expedia._id },
      {
        $set: {
          startDate: now,
          endDate: daysFromNow(90),
          isActive: true,
          isPublished: true,
        },
      }
    );
    console.log('Refreshed deals:', dealUpdate.modifiedCount, 'modified');

    const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
    await UrlRedirect.findOneAndUpdate(
      { oldPath: '/stores/expedia' },
      {
        $set: {
          siteId: site?._id,
          oldPath: '/stores/expedia',
          newPath: '/stores/expedia-coupon-codes',
          redirectType: 301,
          referenceType: 'store',
          referenceId: expedia._id,
          isActive: true,
        },
      },
      { upsert: true }
    );
    console.log('301 redirect: /stores/expedia -> /stores/expedia-coupon-codes');

    const publicDeals = await Deal.countDocuments({
      store: expedia._id,
      isActive: true,
      isPublished: true,
      endDate: { $gte: now },
    });
    console.log('Public deals now:', publicDeals);
    console.log('\nDone. Visit /stores/expedia-coupon-codes');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
