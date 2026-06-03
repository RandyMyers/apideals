const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Category = require('../models/category');
const { buildStoreLookupFilter } = require('./storeResolver');
const { stripLanguagePrefix, URL_CODES } = require('./languagePathUtils');
const { withSiteScope } = require('./tenantQuery');

const PUBLISHED_OFFER = { isPublished: true, isActive: true };

function langPrefixFromPath(pathname = '') {
  const segments = String(pathname).toLowerCase().split('/').filter(Boolean);
  if (segments.length > 0 && URL_CODES.has(segments[0])) {
    return `/${segments[0]}`;
  }
  return '';
}

function withLangPrefix(originalPath, targetPath) {
  const prefix = langPrefixFromPath(originalPath);
  const base = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return prefix ? `${prefix}${base}` : base;
}

function parseDetailPath(path) {
  const normalized = stripLanguagePrefix(path).replace(/\/+$/, '') || '/';
  const store = normalized.match(/^\/stores\/([^/]+)$/i);
  if (store) return { type: 'store', slug: store[1], listPath: '/stores' };
  const coupon = normalized.match(/^\/coupon\/([^/]+)$/i);
  if (coupon) return { type: 'coupon', slug: coupon[1], listPath: '/coupons/all' };
  const deal = normalized.match(/^\/deal\/([^/]+)$/i);
  if (deal) return { type: 'deal', slug: deal[1], listPath: '/deals/all' };
  const category = normalized.match(/^\/categories\/([^/]+)$/i);
  if (category) return { type: 'category', slug: category[1], listPath: '/categories/all' };
  return null;
}

async function storeHasPublishedOffers(storeId, siteId) {
  const couponMatch = withSiteScope({ storeId, ...PUBLISHED_OFFER }, siteId);
  const dealMatch = withSiteScope({ store: storeId, ...PUBLISHED_OFFER }, siteId);
  const [couponCount, dealCount] = await Promise.all([
    Coupon.countDocuments(couponMatch),
    Deal.countDocuments(dealMatch),
  ]);
  return couponCount + dealCount > 0;
}

async function categoryHasPublishedOffers(categoryId, siteId) {
  const couponMatch = withSiteScope({ categoryId, ...PUBLISHED_OFFER }, siteId);
  const dealMatch = withSiteScope({ categoryId, ...PUBLISHED_OFFER }, siteId);
  const [couponCount, dealCount] = await Promise.all([
    Coupon.countDocuments(couponMatch),
    Deal.countDocuments(dealMatch),
  ]);
  return couponCount + dealCount > 0;
}

function slugOrIdFilter(slug) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(slug || '').trim());
  if (isObjectId) return { _id: slug };
  const normalized = String(slug).trim().toLowerCase();
  return { $or: [{ slug: normalized }, { seoSlug: normalized }] };
}

/**
 * 301 targets for store/coupon/deal/category URLs that are no longer public.
 * Used by redirect middleware (Node host) and GET /redirects/resolve (Netlify SPA).
 */
async function resolveUnpublishedEntityRedirect(path, siteId = null) {
  const parsed = parseDetailPath(path);
  if (!parsed) return null;

  const { type, slug, listPath } = parsed;

  if (type === 'store') {
    const store = await Store.findOne(buildStoreLookupFilter(slug, siteId))
      .select('_id isActive')
      .lean();
    if (!store || store.isActive === false) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
    const hasOffers = await storeHasPublishedOffers(store._id, siteId);
    if (!hasOffers) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
    return null;
  }

  if (type === 'coupon') {
    const filter = withSiteScope({ ...slugOrIdFilter(slug), ...PUBLISHED_OFFER }, siteId);
    const exists = await Coupon.exists(filter);
    if (!exists) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
    return null;
  }

  if (type === 'deal') {
    const filter = withSiteScope({ ...slugOrIdFilter(slug), ...PUBLISHED_OFFER }, siteId);
    const exists = await Deal.exists(filter);
    if (!exists) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
    return null;
  }

  if (type === 'category') {
    const cat = await Category.findOne(slugOrIdFilter(slug)).select('_id').lean();
    if (!cat) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
    const hasOffers = await categoryHasPublishedOffers(cat._id, siteId);
    if (!hasOffers) {
      return { newPath: withLangPrefix(path, listPath), redirectType: 301 };
    }
  }

  return null;
}

module.exports = {
  resolveUnpublishedEntityRedirect,
  parseDetailPath,
  withLangPrefix,
};
