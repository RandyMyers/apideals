/**
 * Audit Expedia store, coupons, deals, and landing pages in MongoDB.
 *
 * Mirrors public API visibility rules from storeLandingPageController:
 * - isActive + isPublished
 * - endDate >= now (or missing)
 * - landing entity filters (entityType, entityLocation, entityTags)
 *
 * Usage:
 *   node scripts/checkExpediaStore.js
 *   node scripts/checkExpediaStore.js --verbose
 *   node scripts/checkExpediaStore.js --json
 *   node scripts/checkExpediaStore.js --landing sagrada-familia
 *
 * Requires MONGO_URL / MONGODB_URI / MONGO_URI in server/.env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Store = require('../models/store');
const Deal = require('../models/deal');
const Coupon = require('../models/coupon');
const StoreLandingPage = require('../models/storeLandingPage');
const Category = require('../models/category');
const Site = require('../models/site');

require('../models/category');

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const AS_JSON = args.has('--json');
const landingArgIdx = process.argv.indexOf('--landing');
const LANDING_FILTER = landingArgIdx >= 0 ? process.argv[landingArgIdx + 1] : null;

function buildEntityFilters(landing) {
  const filters = {};
  if (landing.entityType && landing.entityType !== 'all') filters.entityType = landing.entityType;
  if (landing.entityLocation) filters.entityLocation = landing.entityLocation;
  if (Array.isArray(landing.entityTags) && landing.entityTags.length > 0) {
    filters.entityTags = { $in: landing.entityTags };
  }
  return filters;
}

function dealMatchesEntityFilters(deal, entityFilters) {
  if (entityFilters.entityType && deal.entityType !== entityFilters.entityType) return false;
  if (entityFilters.entityLocation && deal.entityLocation !== entityFilters.entityLocation) return false;
  if (entityFilters.entityTags?.$in?.length) {
    const tags = deal.entityTags || [];
    const wanted = entityFilters.entityTags.$in;
    if (!wanted.some((t) => tags.includes(t))) return false;
  }
  return true;
}

function isOfferPublic(offer, now) {
  if (offer.isActive === false) return { ok: false, reason: 'inactive' };
  if (offer.isPublished === false) return { ok: false, reason: 'unpublished' };
  if (offer.endDate && new Date(offer.endDate) < now) return { ok: false, reason: 'expired' };
  if (offer.startDate && new Date(offer.startDate) > now) return { ok: false, reason: 'not_started' };
  return { ok: true, reason: 'public' };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toISOString().slice(0, 10);
}

function fmtPrice(deal) {
  if (deal.originalPrice != null && deal.discountedPrice != null) {
  const cur = deal.currency || '';
  const unit = deal.priceUnit ? ` ${deal.priceUnit}` : '';
  return `${deal.originalPrice} -> ${deal.discountedPrice}${cur ? ` ${cur}` : ''}${unit}`;
  }
  if (deal.discountType && deal.discountValue != null) {
    return deal.discountType === 'percentage' ? `${deal.discountValue}% off` : `${deal.discountValue} fixed off`;
  }
  return '—';
}

function logSection(title) {
  if (AS_JSON) return;
  console.log(`\n${'═'.repeat(80)}`);
  console.log(title);
  console.log('═'.repeat(80));
}

async function findExpediaStores() {
  return Store.find({
    $or: [
      { slug: /^expedia$/i },
      { name: /^expedia$/i },
      { name: /expedia/i },
    ],
  })
    .populate('categoryId', 'name slug')
    .populate('siteId', 'slug name')
    .lean();
}

async function auditStore(store, now) {
  const storeId = store._id;
  const [deals, coupons, landings] = await Promise.all([
    Deal.find({ store: storeId })
      .populate('categoryId', 'name slug')
      .sort({ updatedAt: -1 })
      .lean(),
    Coupon.find({ storeId })
      .populate('categoryId', 'name slug')
      .sort({ updatedAt: -1 })
      .lean(),
    StoreLandingPage.find({ storeId })
      .sort({ slug: 1 })
      .lean(),
  ]);

  const dealRows = deals.map((d) => {
    const visibility = isOfferPublic(d, now);
    return {
      _id: d._id,
      name: d.name,
      slug: d.slug,
      dealType: d.dealType,
      pricing: fmtPrice(d),
      entityType: d.entityType,
      entityName: d.entityName,
      entityLocation: d.entityLocation,
      entityTags: d.entityTags || [],
      startDate: d.startDate,
      endDate: d.endDate,
      isActive: d.isActive !== false,
      isPublished: d.isPublished === true,
      visibility: visibility.reason,
      public: visibility.ok,
      productUrl: d.productUrl,
      category: d.categoryId?.name || null,
    };
  });

  const couponRows = coupons.map((c) => {
    const visibility = isOfferPublic(c, now);
    return {
      _id: c._id,
      title: c.title || c.code,
      code: c.code,
      slug: c.slug,
      discount: c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue} fixed`,
      startDate: c.startDate,
      endDate: c.endDate,
      isActive: c.isActive !== false,
      isPublished: c.isPublished === true,
      visibility: visibility.reason,
      public: visibility.ok,
      category: c.categoryId?.name || null,
    };
  });

  const landingRows = landings
    .filter((L) => !LANDING_FILTER || L.slug === LANDING_FILTER)
    .map((L) => {
      const entityFilters = buildEntityFilters(L);
      const includeDeals = !L.offerTypes || L.offerTypes.includes('deals');
      const includeCoupons = !L.offerTypes || L.offerTypes.includes('coupons');

      const matchedDeals = includeDeals
        ? dealRows.filter((d) => d.public && dealMatchesEntityFilters(
            deals.find((x) => String(x._id) === String(d._id)),
            entityFilters
          ))
        : [];

      const matchedCoupons = includeCoupons
        ? couponRows.filter((c) => c.public)
        : [];

      const landingPublic = L.isActive !== false && L.isPublished !== false;
      const issues = [];
      if (!landingPublic) issues.push('landing inactive or unpublished');
      if (includeDeals && matchedDeals.length === 0) issues.push('no public deals match filters');
      if (includeCoupons && matchedCoupons.length === 0 && coupons.length > 0) {
        issues.push('no public coupons (store has coupons)');
      }

      return {
        slug: L.slug,
        title: L.title,
        isActive: L.isActive !== false,
        isPublished: L.isPublished !== false,
        public: landingPublic,
        offerTypes: L.offerTypes || ['deals', 'coupons'],
        entityType: L.entityType,
        entityLocation: L.entityLocation,
        entityTags: L.entityTags || [],
        apiPath: `/api/v1/store/${store.slug}/landing/${L.slug}`,
        matchedDeals: matchedDeals.length,
        matchedCoupons: matchedCoupons.length,
        issues,
      };
    });

  const issues = [];
  if (store.isActive === false) issues.push('store inactive');
  if (!store.siteId) issues.push('store missing siteId');
  if (!store.categoryId) issues.push('store missing categoryId');
  if (!store.seoSlug) issues.push('store missing seoSlug');
  if (!store.seo?.title) issues.push('store missing seo.title');
  if (!store.seo?.h1) issues.push('store missing seo.h1');
  if (!store.logoAlt) issues.push('store missing logoAlt');
  if (!store.faqs?.length) issues.push('store missing faqs');
  if (deals.length === 0) issues.push('no deals');
  if (dealRows.every((d) => !d.public)) issues.push('no publicly visible deals');
  if (landings.length === 0) issues.push('no landing pages');

  for (const L of landingRows) {
    if (L.issues.length) {
      issues.push(`landing "${L.slug}": ${L.issues.join('; ')}`);
    }
  }

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
      storeIndicators: store.storeIndicators || [],
      dealCount: deals.length,
      couponCount: coupons.length,
      publicDealCount: dealRows.filter((d) => d.public).length,
      publicCouponCount: couponRows.filter((c) => c.public).length,
      landingCount: landings.length,
    },
    deals: dealRows,
    coupons: couponRows,
    landings: landingRows,
    issues,
  };
}

function printReport(report) {
  const { store, deals, coupons, landings, issues } = report;

  logSection('Expedia store');
  console.log(`Name:      ${store.name}`);
  console.log(`Slug:      ${store.slug}`);
  console.log(`ID:        ${store._id}`);
  console.log(`URL:       ${store.url || '—'}`);
  console.log(`Active:    ${store.isActive ? 'yes' : 'NO'}`);
  console.log(`Site:      ${store.site || 'MISSING'}`);
  console.log(`Category:  ${store.category || 'MISSING'}`);
  if (store.storeIndicators.length) {
    console.log(`Indicators: ${store.storeIndicators.map((i) => `${i.key} (${i.label})`).join(', ')}`);
  }
  console.log(
    `Offers:    ${store.dealCount} deals (${store.publicDealCount} public), ${store.couponCount} coupons (${store.publicCouponCount} public), ${store.landingCount} landing(s)`
  );

  logSection(`Deals (${deals.length})`);
  if (deals.length === 0) {
    console.log('(none)');
  } else {
    console.log(
      ['Status'.padEnd(12), 'Dates'.padEnd(23), 'Pricing'.padEnd(28), 'Entity'.padEnd(24), 'Name'].join('  ')
    );
    console.log('-'.repeat(120));
    for (const d of deals) {
      const status = d.public ? 'PUBLIC' : d.visibility.toUpperCase();
      const dates = `${fmtDate(d.startDate)}..${fmtDate(d.endDate)}`;
      const entity = [d.entityType, d.entityLocation].filter(Boolean).join(' @ ') || '—';
      console.log(
        [status.padEnd(12), dates.padEnd(23), d.pricing.slice(0, 27).padEnd(28), entity.slice(0, 23).padEnd(24), d.name.slice(0, 40)].join('  ')
      );
      if (VERBOSE) {
        console.log(`             id=${d._id} slug=${d.slug || '—'} tags=[${d.entityTags.join(', ')}]`);
        if (d.productUrl) console.log(`             url=${d.productUrl}`);
      }
    }
  }

  logSection(`Coupons (${coupons.length})`);
  if (coupons.length === 0) {
    console.log('(none — Expedia travel offers are usually deals, not coupon codes)');
  } else {
    for (const c of coupons) {
      const status = c.public ? 'PUBLIC' : c.visibility.toUpperCase();
      console.log(
        `[${status}] ${c.code} — ${c.discount} (${fmtDate(c.startDate)}..${fmtDate(c.endDate)}) ${c.title || ''}`
      );
      if (VERBOSE) console.log(`       id=${c._id}`);
    }
  }

  logSection(`Landing pages (${landings.length})`);
  if (landings.length === 0) {
    console.log('(none — run verify:store-landings --fix to seed sagrada-familia)');
  } else {
    for (const L of landings) {
      const flag = L.public && L.issues.length === 0 ? 'OK' : 'WARN';
      console.log(`[${flag}] ${L.slug} — ${L.title}`);
      console.log(`      GET ${L.apiPath}`);
      console.log(
        `      active=${L.isActive} published=${L.isPublished} offers=${(L.offerTypes || []).join('+')} matched=${L.matchedDeals} deals, ${L.matchedCoupons} coupons`
      );
      if (L.entityType || L.entityLocation || (L.entityTags || []).length) {
        console.log(
          `      filters: type=${L.entityType || 'any'} location=${L.entityLocation || 'any'} tags=[${(L.entityTags || []).join(', ')}]`
        );
      }
      if (L.issues.length) console.log(`      issues: ${L.issues.join('; ')}`);
    }
  }

  logSection('Summary');
  if (issues.length === 0) {
    console.log('No issues found.');
  } else {
    console.log(`Found ${issues.length} issue(s):`);
    issues.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
  }

  console.log('\nRelated scripts:');
  console.log('  npm run seed:expedia-sagrada   — seed Barcelona hotel deals');
  console.log('  npm run verify:store-landings  — audit/fix landing page rows');
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const now = new Date();

  if (!AS_JSON) {
    console.log('Connected to MongoDB');
    console.log(`Checked at: ${now.toISOString()}\n`);
  }

  const stores = await findExpediaStores();
  if (stores.length === 0) {
    const payload = { ok: false, error: 'Expedia store not found', stores: [] };
    if (AS_JSON) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.error('[ERROR] Expedia store not found (slug/name match).');
      console.error('Create the store first, then run seed:expedia-sagrada.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  const reports = [];
  for (const store of stores) {
    reports.push(await auditStore(store, now));
  }

  const output = {
    ok: reports.every((r) => r.issues.length === 0),
    checkedAt: now.toISOString(),
    storeCount: reports.length,
    reports,
  };

  if (AS_JSON) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const report of reports) {
      printReport(report);
    }
    if (reports.length > 1) {
      logSection('All Expedia store matches');
      console.log(`Matched ${reports.length} store document(s). Review each report above.`);
    }
  }

  await mongoose.disconnect();
  if (!AS_JSON) console.log('\nDisconnected.');

  if (!output.ok) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
