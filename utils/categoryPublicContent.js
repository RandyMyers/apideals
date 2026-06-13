const mongoose = require('mongoose');
const Category = require('../models/category');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const { withSiteScope } = require('./tenantQuery');

function buildPublishedOfferFilter(siteId) {
  const base = { isPublished: true, isActive: true };
  if (!siteId) return base;
  return {
    ...base,
    $or: [{ siteId }, { siteId: { $exists: false } }, { siteId: null }],
  };
}

/**
 * Category IDs with at least one published offer (direct categoryId) or via active store.
 */
async function getCategoryIdsWithPublicContent(siteId = null) {
  const offerFilter = buildPublishedOfferFilter(siteId);

  const [couponCategoryIds, dealCategoryIds, couponStoreIds, dealStoreIds] = await Promise.all([
    Coupon.distinct(
      'categoryId',
      withSiteScope({ ...offerFilter, categoryId: { $exists: true, $ne: null } }, siteId)
    ),
    Deal.distinct(
      'categoryId',
      withSiteScope({ ...offerFilter, categoryId: { $exists: true, $ne: null } }, siteId)
    ),
    Coupon.distinct(
      'storeId',
      withSiteScope({ ...offerFilter, storeId: { $exists: true, $ne: null } }, siteId)
    ),
    Deal.distinct(
      'store',
      withSiteScope({ ...offerFilter, store: { $exists: true, $ne: null } }, siteId)
    ),
  ]);

  const storeIdSet = new Set(
    [...couponStoreIds, ...dealStoreIds].filter(Boolean).map((id) => String(id))
  );

  let storeCategoryIds = [];
  if (storeIdSet.size > 0) {
    const storeObjectIds = [...storeIdSet]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    storeCategoryIds = await Store.distinct(
      'categoryId',
      withSiteScope(
        {
          _id: { $in: storeObjectIds },
          isActive: true,
          categoryId: { $exists: true, $ne: null },
        },
        siteId
      )
    );
  }

  const ids = new Set();
  [...couponCategoryIds, ...dealCategoryIds, ...storeCategoryIds]
    .filter(Boolean)
    .forEach((id) => ids.add(String(id)));
  return ids;
}

async function findCategoryBySlug(slugOrId) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(slugOrId || '').trim());
  if (isObjectId) {
    return Category.findById(slugOrId).lean();
  }
  const { buildSlugOrConditions } = require('./slugResolver');
  const or = buildSlugOrConditions(slugOrId, ['slug', 'seoSlug']);
  return Category.findOne({ $or: or }).lean();
}

module.exports = {
  buildPublishedOfferFilter,
  getCategoryIdsWithPublicContent,
  findCategoryBySlug,
};
