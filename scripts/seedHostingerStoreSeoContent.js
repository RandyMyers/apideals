/**
 * Seed Hostinger store SEO content + refresh offer dates for public visibility.
 *
 * Usage:
 *   node scripts/seedHostingerStoreSeoContent.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Deal = require('../models/deal');
const Coupon = require('../models/coupon');
const UrlRedirect = require('../models/urlRedirect');
const Site = require('../models/site');

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function buildPayload(now) {
  const keyword = 'Hostinger coupon code'; // keep exact phrase across locales

  const baseShared = {
    savingTips: [
      { tip: `Try the ${keyword} on annual plans for the biggest savings.`, order: 1, isActive: true },
      { tip: `If a ${keyword} doesn’t apply, check plan eligibility (Premium vs Business vs Cloud).`, order: 2, isActive: true },
      { tip: `Hostinger promos often exclude renewals—use “existing customer” offers when available.`, order: 3, isActive: true },
      { tip: `Verify whether the ${keyword} works for domain registration or hosting only.`, order: 4, isActive: true },
      { tip: `We update this page weekly and hide expired Hostinger offers.`, order: 5, isActive: true },
    ],
    faqs: [
      {
        question: `Is the ${keyword} legit?`,
        answer:
          `Yes—when it comes from Hostinger or authorized partners. DealCouponz lists verified hosting deals and updates this page regularly to remove expired offers.`,
        group: 'faq',
        order: 1,
        isActive: true,
      },
      {
        question: `Why isn’t my ${keyword} working?`,
        answer:
          `Common reasons include plan restrictions (new vs existing customer), minimum term requirements (annual billing), exclusions on renewals, or the offer being expired. Try a different plan link on this page and confirm the discount appears before paying.`,
        group: 'troubleshooting',
        order: 1,
        isActive: true,
      },
      {
        question: `Can I stack a ${keyword} with other promotions?`,
        answer:
          `Usually you can’t stack multiple promo codes. Hostinger often applies one discount at checkout, but intro pricing may already be baked in. Check the final price breakdown before payment.`,
        group: 'paa',
        order: 1,
        isActive: true,
      },
    ],
    editorial: {
      howToSteps: [
        `Click a deal on this page to open Hostinger in a new tab.`,
        `Choose your hosting plan and billing term (monthly/annual).`,
        `Proceed to checkout and look for a promo/coupon code field.`,
        `Paste the ${keyword} and apply it.`,
        `Confirm the discounted total is shown before you pay.`,
      ],
      comparisonRows: [
        { type: 'Premium', worksBestFor: 'Personal sites / small brands', typicalDiscount: '% off', notes: 'Best for 1–3 websites.' },
        { type: 'Business', worksBestFor: 'Ecommerce / growing sites', typicalDiscount: '% off', notes: 'More resources + backups.' },
        { type: 'Cloud', worksBestFor: 'High-traffic projects', typicalDiscount: '% off', notes: 'Dedicated cloud resources.' },
      ],
      stackingNote:
        `Hostinger typically allows one promo code per checkout. Use one ${keyword} and compare the final total—intro pricing may already be included.`,
      exclusionsNote:
        `Some discounts apply only to new customers or specific billing terms. Renewals may require separate “existing customer” offers.`,
      externalLinks: [{ label: 'Hostinger support', url: 'https://www.hostinger.com/contact' }],
      internalLinks: [
        { label: 'All software deals', path: '/categories/software-apps', anchorText: 'Software deals and coupon codes' },
        { label: 'All stores', path: '/stores/all', anchorText: 'Browse all store coupon codes' },
      ],
      authorByline: 'Reviewed by the DealCouponz software deals team',
    },
  };

  const mkSeo = (variantLabel = '') => ({
    primaryKeyword: 'hostinger coupon code',
    title: `Hostinger Coupon Code (2026): Verified Discounts${variantLabel ? ` (${variantLabel})` : ''}`,
    metaDescription:
      `Find a working Hostinger coupon code for web hosting and website plans. Updated weekly with verified deals, FAQs, and step-by-step checkout help on DealCouponz.`,
    h1: `Hostinger Coupon Code 2026`,
    intro:
      `Looking for a Hostinger coupon code that actually applies at checkout? This page lists verified Hostinger discounts we refresh weekly. ` +
      `Use our links to open the exact offer, then apply the Hostinger coupon code at checkout when eligible.`,
    keywords: ['hostinger coupon code', 'hostinger promo code', 'hostinger discount', 'web hosting deals'],
  });

  const base = {
    seoSlug: 'hostinger-coupon-code',
    logoAlt: `Hostinger logo — ${keyword} on DealCouponz`,
    contentUpdatedAt: now,
    lastVerifiedAt: now,
    description:
      `DealCouponz lists verified Hostinger hosting discounts and updates this page weekly. Use the Hostinger coupon code when available, or click a deal link to activate the discount automatically at checkout.`,
    seo: mkSeo(''),
    savingTips: baseShared.savingTips,
    faqs: baseShared.faqs,
    editorial: baseShared.editorial,
    languageTranslations: {},
  };

  // Reuse Expedia store's supported locale set for consistency.
  const locales = ['en-GB','en-AU','ga','de','de-AT','es','es-MX','it','no','fi','da','sv','fr','pt','nl','ja','ko'];
  for (const code of locales) {
    base.languageTranslations[code] = {
      seo: mkSeo(code),
      logoAlt: `Hostinger logo — ${keyword} (DealCouponz)`,
      description: `Verified ${keyword} offers and hosting deals updated weekly on DealCouponz.`,
      savingTips: baseShared.savingTips,
      faqs: baseShared.faqs,
      editorial: baseShared.editorial,
    };
  }

  return base;
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const now = new Date();

  try {
    const hostinger = await Store.findOne({
      $or: [{ slug: /^hostinger$/i }, { seoSlug: 'hostinger-coupon-code' }, { name: /^hostinger$/i }, { url: /hostinger\.com/i }],
    });
    if (!hostinger) {
      console.error('Hostinger store not found. Run seedPopularStores (or create store) first.');
      process.exit(1);
    }

    const payload = buildPayload(now);
    await Store.updateOne({ _id: hostinger._id }, { $set: payload });
    console.log('Updated Hostinger store SEO fields');

    // Refresh existing Hostinger offers to ensure they are public (for ranking).
    const dealUpdate = await Deal.updateMany(
      { store: hostinger._id },
      { $set: { startDate: now, endDate: daysFromNow(120), isActive: true, isPublished: true } }
    );
    const couponUpdate = await Coupon.updateMany(
      { storeId: hostinger._id },
      { $set: { startDate: now, endDate: daysFromNow(120), isActive: true, isPublished: true } }
    );
    console.log('Refreshed Hostinger deals:', dealUpdate.modifiedCount, 'modified');
    console.log('Refreshed Hostinger coupons:', couponUpdate.modifiedCount, 'modified');

    const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
    await UrlRedirect.findOneAndUpdate(
      { oldPath: '/stores/hostinger' },
      {
        $set: {
          siteId: site?._id,
          oldPath: '/stores/hostinger',
          newPath: '/stores/hostinger-coupon-code',
          redirectType: 301,
          referenceType: 'store',
          referenceId: hostinger._id,
          isActive: true,
        },
      },
      { upsert: true }
    );
    console.log('301 redirect: /stores/hostinger -> /stores/hostinger-coupon-code');

    const publicDeals = await Deal.countDocuments({
      store: hostinger._id,
      isActive: true,
      isPublished: true,
      endDate: { $gte: now },
    });
    const publicCoupons = await Coupon.countDocuments({
      storeId: hostinger._id,
      isActive: true,
      isPublished: true,
      endDate: { $gte: now },
    });
    console.log('Public Hostinger deals now:', publicDeals);
    console.log('Public Hostinger coupons now:', publicCoupons);
    console.log('\\nDone. Visit /stores/hostinger-coupon-code');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();

