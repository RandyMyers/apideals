/**
 * Audit Hostinger store, coupons, deals, and landing pages in MongoDB.
 *
 * Usage:
 *   node scripts/checkHostingerStore.js
 *   node scripts/checkHostingerStore.js --verbose
 *   node scripts/checkHostingerStore.js --json
 *
 * Requires MONGO_URL / MONGODB_URI / MONGO_URI in server/.env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Store = require('../models/store');
const Deal = require('../models/deal');
const Coupon = require('../models/coupon');
const StoreLandingPage = require('../models/storeLandingPage');
require('../models/category');
require('../models/site');

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const AS_JSON = args.has('--json');

function isOfferPublic(offer, now) {
  if (offer.isActive === false) return { ok: false, reason: 'inactive' };
  if (offer.isPublished === false) return { ok: false, reason: 'unpublished' };
  if (offer.endDate && new Date(offer.endDate) < now) return { ok: false, reason: 'expired' };
  if (offer.startDate && new Date(offer.startDate) > now) return { ok: false, reason: 'not_started' };
  return { ok: true, reason: 'public' };
}

function logSection(title) {
  if (AS_JSON) return;
  console.log(`\n${'═'.repeat(80)}`);
  console.log(title);
  console.log('═'.repeat(80));
}

async function findHostingerStores() {
  return Store.find({
    $or: [{ slug: /^hostinger$/i }, { name: /^hostinger$/i }, { name: /hostinger/i }, { url: /hostinger\.com/i }],
  })
    .populate('categoryId', 'name slug')
    .populate('siteId', 'slug name')
    .lean();
}

async function auditStore(store, now) {
  const storeId = store._id;
  const [deals, coupons, landings] = await Promise.all([
    Deal.find({ store: storeId }).sort({ updatedAt: -1 }).lean(),
    Coupon.find({ storeId }).sort({ updatedAt: -1 }).lean(),
    StoreLandingPage.find({ storeId }).sort({ slug: 1 }).lean(),
  ]);

  const dealsPublic = deals.filter((d) => isOfferPublic(d, now).ok);
  const couponsPublic = coupons.filter((c) => isOfferPublic(c, now).ok);

  const issues = [];
  if (store.isActive === false) issues.push('store inactive');
  if (!store.seoSlug) issues.push('store missing seoSlug');
  if (!store.seo?.primaryKeyword) issues.push('store missing seo.primaryKeyword');
  if (!store.seo?.title) issues.push('store missing seo.title');
  if (!store.seo?.metaDescription) issues.push('store missing seo.metaDescription');
  if (!store.seo?.h1) issues.push('store missing seo.h1');
  if (!store.logoAlt) issues.push('store missing logoAlt');
  if (!store.faqs?.length) issues.push('store missing faqs');
  if (deals.length === 0 && coupons.length === 0) issues.push('no offers (deals/coupons)');
  if (deals.length > 0 && dealsPublic.length === 0) issues.push('no publicly visible deals');
  if (coupons.length > 0 && couponsPublic.length === 0) issues.push('no publicly visible coupons');

  return {
    store: {
      _id: store._id,
      name: store.name,
      slug: store.slug,
      seoSlug: store.seoSlug || null,
      url: store.url,
      isActive: store.isActive !== false,
      site: store.siteId?.slug || store.siteId?.name || null,
      category: store.categoryId?.name || null,
      dealCount: deals.length,
      couponCount: coupons.length,
      publicDealCount: dealsPublic.length,
      publicCouponCount: couponsPublic.length,
      landingCount: landings.length,
    },
    issues,
  };
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const now = new Date();

  const stores = await findHostingerStores();
  if (stores.length === 0) {
    if (AS_JSON) console.log(JSON.stringify({ ok: false, error: 'Hostinger store not found' }, null, 2));
    else console.error('Hostinger store not found.');
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const reports = [];
  for (const st of stores) reports.push(await auditStore(st, now));

  const ok = reports.every((r) => r.issues.length === 0);
  if (AS_JSON) {
    console.log(JSON.stringify({ ok, checkedAt: now.toISOString(), reports }, null, 2));
  } else {
    for (const r of reports) {
      logSection('Hostinger store');
      console.log(`Name:      ${r.store.name}`);
      console.log(`Slug:      ${r.store.slug}`);
      console.log(`SEO Slug:  ${r.store.seoSlug || 'MISSING'}`);
      console.log(`URL:       ${r.store.url || '—'}`);
      console.log(`Active:    ${r.store.isActive ? 'yes' : 'NO'}`);
      console.log(`Site:      ${r.store.site || '—'}`);
      console.log(`Category:  ${r.store.category || '—'}`);
      console.log(`Offers:    ${r.store.dealCount} deals (${r.store.publicDealCount} public), ${r.store.couponCount} coupons (${r.store.publicCouponCount} public)`);
      if (VERBOSE) console.log(JSON.stringify(r.store, null, 2));
      logSection('Summary');
      if (r.issues.length === 0) console.log('No issues found.');
      else r.issues.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
    }
  }

  await mongoose.disconnect();
  if (!ok) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

