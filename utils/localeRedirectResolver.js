/**
 * Resolve whether a locale-prefixed URL should 302 to its English equivalent.
 */
const Store = require('../models/store');
const Category = require('../models/category');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Blog = require('../models/blog');
const { URL_CODE_BY_LANG, URL_CODES } = require('./languagePathUtils');
const { buildStoreLookupFilter } = require('./storeResolver');
const { buildEntityLookupFilter } = require('./slugResolver');
const { loadStoreOfferCountMaps } = require('./storeOfferCounts');
const {
  hasStoreTranslation,
  hasOfferTranslation,
  hasCategoryTranslation,
  hasBlogTranslationForRedirect,
  listEntityTranslationLocales,
  listBlogTranslationLocales,
} = require('./translationCoverage');
const {
  staticPageHasUiTranslation,
  localeHasAnyUiBundle,
} = require('./uiLocaleCoverage');
const {
  classifyNeutralPath,
} = require('../scripts/lib/auditTranslationHelpers');

const URL_CODE_TO_LANG = {};
for (const [lang, urlCode] of Object.entries(URL_CODE_BY_LANG)) {
  if (urlCode) URL_CODE_TO_LANG[urlCode] = lang;
}

const SKIP_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/check-email',
  '/profile',
  '/dashboard',
  '/search',
  '/submit-coupon',
  '/my-submissions',
  '/woocommerce',
  '/admin',
  '/forum',
  '/u/',
];

let storeIdsWithOffersCache = null;
let storeIdsCacheAt = 0;
const STORE_IDS_TTL_MS = 5 * 60 * 1000;

async function getStoreIdsWithOffers() {
  const now = Date.now();
  if (storeIdsWithOffersCache && now - storeIdsCacheAt < STORE_IDS_TTL_MS) {
    return storeIdsWithOffersCache;
  }
  const maps = await loadStoreOfferCountMaps(null);
  storeIdsWithOffersCache = maps.storeIdsWithOffers || [];
  storeIdsCacheAt = now;
  return storeIdsWithOffersCache;
}

function parseLocalePath(rawPath) {
  const pathname = String(rawPath || '/').split('?')[0].split('#')[0];
  let clean = pathname.trim();
  if (!clean.startsWith('/')) clean = `/${clean}`;
  const segments = clean.split('/').filter(Boolean);
  let urlCode = null;
  let lang = 'en';
  if (segments.length && URL_CODES.has(segments[0])) {
    urlCode = segments[0];
    lang = URL_CODE_TO_LANG[urlCode] || urlCode;
    segments.shift();
  }
  const neutralPath = segments.length ? `/${segments.join('/')}` : '/';
  return { urlCode, lang, neutralPath: neutralPath.replace(/\/+$/, '') || '/' };
}

function shouldSkipPath(neutralPath) {
  if (SKIP_PREFIXES.some((p) => neutralPath === p || neutralPath.startsWith(p))) {
    return true;
  }
  return false;
}

function entityHasLocaleTranslation(entity, entityType, locale) {
  if (!entity || locale === 'en') return true;
  const checkers = {
    store: hasStoreTranslation,
    category: hasCategoryTranslation,
    coupon: hasOfferTranslation,
    deal: hasOfferTranslation,
    blog: hasBlogTranslationForRedirect,
  };
  const fn = checkers[entityType];
  return fn ? fn(entity, locale) : false;
}

async function fetchEntity(classified) {
  const { type, slug } = classified;
  const slugKey = String(slug || '').trim();
  if (!slugKey) return null;

  if (type === 'store') {
    const storeIds = await getStoreIdsWithOffers();
    const filter = buildStoreLookupFilter(slugKey, null);
    const query = storeIds.length
      ? { $and: [filter, { isActive: true, _id: { $in: storeIds } }] }
      : { $and: [filter, { isActive: true }] };
    return Store.findOne(query).select('slug seoSlug languageTranslations isActive').lean();
  }

  if (type === 'category') {
    const filter = buildEntityLookupFilter(slugKey, null, ['slug', 'seoSlug']);
    return Category.findOne(filter).select('slug seoSlug languageTranslations').lean();
  }

  if (type === 'coupon') {
    const filter = buildEntityLookupFilter(slugKey, null, ['slug', 'seoSlug']);
    return Coupon.findOne({ ...filter, isActive: true, isPublished: true })
      .select('slug seoSlug languageTranslations')
      .lean();
  }

  if (type === 'deal') {
    const filter = buildEntityLookupFilter(slugKey, null, ['slug', 'seoSlug']);
    return Deal.findOne({ ...filter, isActive: true, isPublished: true })
      .select('slug seoSlug languageTranslations')
      .lean();
  }

  if (type === 'blog') {
    const filter = buildEntityLookupFilter(slugKey, null, ['slug']);
    return Blog.findOne({ ...filter, isPublished: true })
      .select('slug titleTranslations contentTranslations excerptTranslations metaDescriptionTranslations')
      .lean();
  }

  return null;
}

function buildEnglishPath(neutralPath, classified) {
  if (classified.type === 'storeLanding') {
    return `/stores/${classified.slug}/${classified.landingSlug}`;
  }
  return neutralPath;
}

/**
 * @returns {Promise<{ redirect: string|null, reason?: string, locale?: string, urlCode?: string }>}
 */
async function resolveLocaleRedirect(rawPath) {
  const { urlCode, lang, neutralPath } = parseLocalePath(rawPath);

  if (!urlCode || lang === 'en') {
    return { redirect: null };
  }

  if (shouldSkipPath(neutralPath)) {
    return { redirect: null, reason: 'skipped_auth_or_app_path' };
  }

  const classified = classifyNeutralPath(neutralPath);

  if (classified.type === 'other') {
    return { redirect: null, reason: 'unclassified_path' };
  }

  if (classified.type === 'list') {
    return { redirect: null, reason: 'list_page_ui_only' };
  }

  if (classified.type === 'home') {
    if (localeHasAnyUiBundle(lang)) {
      return { redirect: null, reason: 'home_ui_present' };
    }
    return {
      redirect: '/',
      reason: 'missing_home_ui',
      locale: lang,
      urlCode,
    };
  }

  if (classified.type === 'static') {
    const ui = staticPageHasUiTranslation(lang, classified.path);
    if (ui.hasUi) {
      return { redirect: null, reason: 'static_ui_present' };
    }
    return {
      redirect: classified.path,
      reason: 'missing_static_ui',
      locale: lang,
      urlCode,
    };
  }

  if (classified.type === 'storeLanding') {
    return {
      redirect: buildEnglishPath(neutralPath, classified),
      reason: 'store_landing_no_i18n',
      locale: lang,
      urlCode,
    };
  }

  const entity = await fetchEntity(classified);
  if (!entity) {
    return { redirect: null, reason: 'entity_not_found' };
  }

  if (entityHasLocaleTranslation(entity, classified.type, lang)) {
    return { redirect: null, reason: 'translation_present' };
  }

  return {
    redirect: buildEnglishPath(neutralPath, classified),
    reason: `missing_${classified.type}_translation`,
    locale: lang,
    urlCode,
  };
}

function getEntityTranslatedLocales(entity, entityType) {
  if (!entity) return [];
  if (entityType === 'blog') {
    return listBlogTranslationLocales(entity);
  }
  return listEntityTranslationLocales(entity, entityType);
}

module.exports = {
  parseLocalePath,
  resolveLocaleRedirect,
  getEntityTranslatedLocales,
  URL_CODE_TO_LANG,
};
