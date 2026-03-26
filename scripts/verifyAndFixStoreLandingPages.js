/**
 * Audit (and optionally repair) data for public store landing pages.
 *
 * Public API: GET /api/v1/store/:storeSlug/landing/:landingSlug
 *
 * Common 404 causes:
 * - No StoreLandingPage row for that store + slug
 * - Landing isActive / isPublished false
 * - Store inactive or missing siteId while tenant always sets req.siteId
 * - Orphan landing (invalid storeId)
 *
 * Usage:
 *   node scripts/verifyAndFixStoreLandingPages.js
 *   node scripts/verifyAndFixStoreLandingPages.js --fix
 *   node scripts/verifyAndFixStoreLandingPages.js --fix --publish-landings
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Store = require('../models/store');
const StoreLandingPage = require('../models/storeLandingPage');
const Site = require('../models/site');

const args = new Set(process.argv.slice(2));
const DO_FIX = args.has('--fix');
const DO_PUBLISH = args.has('--publish-landings');

const EXPEDIA_LANDING_SLUG = 'sagrada-familia';

function expediaLandingPayload(storeId, landingSiteId) {
  return {
    siteId: landingSiteId || undefined,
    storeId,
    title: 'Hotels & stays near Sagrada Familia (Barcelona)',
    slug: EXPEDIA_LANDING_SLUG,
    description:
      'Latest Expedia hotel deals near Sagrada Familia and the Eixample. Filtered by location and tags for stable backlinks.',
    seoTitle: 'Expedia deals near Sagrada Familia | Barcelona',
    seoDescription: 'Browse active hotel deals near Sagrada Familia on Expedia.',
    isActive: true,
    isPublished: true,
    availableCountries: ['WORLDWIDE'],
    isWorldwide: true,
    offerTypes: ['deals'],
    entityType: 'hotel',
    entityLocation: 'Barcelona, ES',
    entityTags: ['sagrada-familia', 'barcelona', 'eixample'],
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
  console.log(DO_FIX ? 'Mode: FIX (writes enabled)\n' : 'Mode: REPORT ONLY (pass --fix to apply)\n');

  const defaultSite =
    (await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id slug').lean()) ||
    (await Site.findOne({ isActive: true }).sort({ createdAt: 1 }).select('_id slug').lean());

  const tenantSiteId = defaultSite?._id || null;

  if (!defaultSite) {
    console.warn('No active Site found. siteId backfills will be skipped.\n');
  } else {
    console.log(`Tenant site: ${defaultSite.slug || '?'} (${tenantSiteId})\n`);
  }

  const allStores = await Store.find({}).select('_id name slug isActive siteId').lean();
  const storesById = new Map(allStores.map((s) => [String(s._id), s]));

  const landings = await StoreLandingPage.find({}).lean();
  const issues = [];

  /** @type {Set<string>} */
  const storeIdsNeedingSiteId = new Set();
  /** @type {Set<string>} */
  const landingIdsAlignSiteFromStore = new Set();
  /** @type {Set<string>} */
  const landingIdsPublish = new Set();

  console.log('--- Store landing pages ---\n');

  for (const L of landings) {
    const sid = String(L.storeId);
    const store = storesById.get(sid);
    const apiHint = store ? `/api/v1/store/${store.slug}/landing/${L.slug}` : '(unknown store)';

    if (!store) {
      issues.push({ type: 'orphan_landing', landingId: L._id, slug: L.slug });
      console.log(`[BAD]  ${apiHint}  orphan storeId=${sid}`);
      continue;
    }

    if (store.isActive === false) {
      issues.push({ type: 'inactive_store', slug: store.slug });
      console.log(`[WARN] ${apiHint}  store inactive -> public lookup may 404`);
    }

    if (L.isPublished === false || L.isActive === false) {
      issues.push({ type: 'landing_unpublished', slug: L.slug, store: store.slug });
      console.log(`[WARN] ${apiHint}  isActive=${L.isActive} isPublished=${L.isPublished} -> public API 404`);
      if (DO_FIX && DO_PUBLISH) {
        landingIdsPublish.add(String(L._id));
      }
    }

    if (tenantSiteId && store.siteId && L.siteId && String(store.siteId) !== String(L.siteId)) {
      issues.push({ type: 'siteId_mismatch', store: store.slug, landing: L.slug });
      console.log(`[FIX?] ${apiHint}  landing.siteId != store.siteId`);
      if (DO_FIX) landingIdsAlignSiteFromStore.add(String(L._id));
    }

    if (tenantSiteId && store.siteId && !L.siteId) {
      console.log(`[FIX?] ${apiHint}  landing missing siteId (store has one)`);
      if (DO_FIX) landingIdsAlignSiteFromStore.add(String(L._id));
    }

    if (tenantSiteId && !store.siteId) {
      storeIdsNeedingSiteId.add(String(store._id));
    }

    console.log(`[ROW]  ${apiHint}`);
  }

  if (landings.length === 0) {
    console.log('(no StoreLandingPage documents)\n');
  }

  console.log('\n--- Expedia + Sagrada Familia ---\n');
  const expediaStores = await Store.find({
    $or: [{ slug: /^expedia$/i }, { name: /^expedia$/i }],
  })
    .select('_id name slug siteId isActive')
    .lean();

  if (expediaStores.length === 0) {
    issues.push({ type: 'no_expedia_store' });
    console.log('[WARN] No Expedia store (slug/name match).');
  }

  for (const st of expediaStores) {
    const existing = await StoreLandingPage.findOne({
      storeId: st._id,
      slug: EXPEDIA_LANDING_SLUG,
    }).lean();

    const missing = !existing;
    const off = existing && (existing.isPublished === false || existing.isActive === false);

    console.log(`Store ${st.name} (${st.slug}) siteId=${st.siteId || 'null'} active=${st.isActive}`);
    console.log(`  ${EXPEDIA_LANDING_SLUG}: ${missing ? 'MISSING' : 'ok'}${off ? ' (inactive/unpublished)' : ''}`);
    console.log(`  GET /api/v1/store/${st.slug}/landing/${EXPEDIA_LANDING_SLUG}`);

    if (st.isActive === false) {
      issues.push({ type: 'expedia_inactive', slug: st.slug });
    }
    if (missing || off) {
      issues.push({ type: 'expedia_landing_gap', slug: st.slug, missing, off });
    }
  }

  if (!DO_FIX) {
    console.log('\n--- Next step ---\n');
    console.log('Run: node scripts/verifyAndFixStoreLandingPages.js --fix');
    console.log('Optional: add --publish-landings to force isActive+isPublished on all existing landings that were off.\n');
    console.log(`Issue tally: ${issues.length}`);
    await mongoose.disconnect();
    console.log('Disconnected.');
    return;
  }

  console.log('\n--- Applying fixes ---\n');

  let n = 0;

  for (const idStr of storeIdsNeedingSiteId) {
    if (!tenantSiteId) break;
    await Store.updateOne({ _id: idStr }, { $set: { siteId: tenantSiteId } });
    const s = storesById.get(idStr);
    if (s) s.siteId = tenantSiteId;
    console.log(`Store ${idStr} (${s?.slug || '?'}) -> set siteId`);
    n += 1;
  }

  for (const idStr of landingIdsAlignSiteFromStore) {
    const L = await StoreLandingPage.findById(idStr).lean();
    if (!L) continue;
    const store = storesById.get(String(L.storeId));
    if (!store?.siteId) continue;
    await StoreLandingPage.updateOne({ _id: idStr }, { $set: { siteId: store.siteId, updatedAt: new Date() } });
    console.log(`Landing ${idStr} -> siteId aligned to store ${store.slug}`);
    n += 1;
  }

  for (const idStr of landingIdsPublish) {
    await StoreLandingPage.updateOne(
      { _id: idStr },
      { $set: { isActive: true, isPublished: true, updatedAt: new Date() } }
    );
    console.log(`Landing ${idStr} -> published + active`);
    n += 1;
  }

  for (const st of expediaStores) {
    const fresh = await Store.findById(st._id).select('siteId').lean();
    let landingSiteId = fresh?.siteId || tenantSiteId;
    if (!fresh?.siteId && tenantSiteId) {
      await Store.updateOne({ _id: st._id }, { $set: { siteId: tenantSiteId } });
      landingSiteId = tenantSiteId;
      console.log(`Expedia store -> set siteId`);
      n += 1;
    }

    const existing = await StoreLandingPage.findOne({ storeId: st._id, slug: EXPEDIA_LANDING_SLUG }).lean();
    const need = !existing || existing.isPublished === false || existing.isActive === false;
    if (need) {
      await StoreLandingPage.findOneAndUpdate(
        { storeId: st._id, slug: EXPEDIA_LANDING_SLUG },
        { $set: expediaLandingPayload(st._id, landingSiteId) },
        { upsert: true, new: true }
      );
      console.log(`Upserted landing ${EXPEDIA_LANDING_SLUG} for ${st.slug}`);
      n += 1;
    }
  }

  console.log(`\nApplied ${n} change(s). Re-run without --fix to confirm.\n`);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
