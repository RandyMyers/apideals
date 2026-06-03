const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const { withSiteScope } = require('./tenantQuery');

function toCountMap(rows) {
    const map = new Map();
    for (const row of rows) {
        if (row._id) map.set(String(row._id), row.count);
    }
    return map;
}

/**
 * Aggregate coupon/deal counts per store.
 * Public counts = isPublished + isActive (what the client should show).
 * Totals include all offers (admin reporting).
 */
async function loadStoreOfferCountMaps(siteId) {
    const couponBase = { storeId: { $exists: true, $ne: null } };
    const dealBase = { store: { $exists: true, $ne: null } };
    const publishedCouponMatch = { ...couponBase, isPublished: true, isActive: true };
    const publishedDealMatch = { ...dealBase, isPublished: true, isActive: true };

    const [couponTotals, dealTotals, couponPublished, dealPublished] = await Promise.all([
        Coupon.aggregate([
            { $match: withSiteScope(couponBase, siteId) },
            { $group: { _id: '$storeId', count: { $sum: 1 } } },
        ]),
        Deal.aggregate([
            { $match: withSiteScope(dealBase, siteId) },
            { $group: { _id: '$store', count: { $sum: 1 } } },
        ]),
        Coupon.aggregate([
            { $match: withSiteScope(publishedCouponMatch, siteId) },
            { $group: { _id: '$storeId', count: { $sum: 1 } } },
        ]),
        Deal.aggregate([
            { $match: withSiteScope(publishedDealMatch, siteId) },
            { $group: { _id: '$store', count: { $sum: 1 } } },
        ]),
    ]);

    const totalCoupons = toCountMap(couponTotals);
    const totalDeals = toCountMap(dealTotals);
    const activeCoupons = toCountMap(couponPublished);
    const activeDeals = toCountMap(dealPublished);

    const storeIdsWithOffers = new Set([...activeCoupons.keys(), ...activeDeals.keys()]);

    return {
        totalCoupons,
        totalDeals,
        activeCoupons,
        activeDeals,
        storeIdsWithOffers: [...storeIdsWithOffers],
    };
}

function attachOfferCountsToStore(store, maps) {
    const id = String(store._id);
    const totalCouponCount = maps.totalCoupons.get(id) || 0;
    const totalDealCount = maps.totalDeals.get(id) || 0;
    return {
        ...store,
        couponCount: maps.activeCoupons.get(id) || 0,
        dealCount: maps.activeDeals.get(id) || 0,
        activeCouponCount: maps.activeCoupons.get(id) || 0,
        activeDealCount: maps.activeDeals.get(id) || 0,
        totalCouponCount,
        totalDealCount,
    };
}

function attachOfferCountsToStores(stores, maps) {
    return stores.map((store) => attachOfferCountsToStore(store, maps));
}

module.exports = {
    loadStoreOfferCountMaps,
    attachOfferCountsToStore,
    attachOfferCountsToStores,
};
