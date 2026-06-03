/**
 * Search Controller
 * Handles search suggestions and trending searches
 */

const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const mongoose = require('mongoose');
const { isCountryAvailable } = require('../utils/countryUtils');
const { loadStoreOfferCountMaps } = require('../utils/storeOfferCounts');

function buildSearchRegex(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/**
 * Get search suggestions based on query
 * Searches across stores, coupons, deals, and categories
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const query = q.trim().toLowerCase();
    const searchLimit = parseInt(limit);

    // Search stores
    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    })
      .select('name logo _id')
      .limit(Math.ceil(searchLimit * 0.4)) // 40% stores
      .lean();

    // Search coupons
    const coupons = await Coupon.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
      isPublished: true,
    })
      .select('title code discountType discountValue storeId _id')
      .populate('storeId', 'name logo')
      .limit(Math.ceil(searchLimit * 0.3)) // 30% coupons
      .lean();

    // Search deals
    const deals = await Deal.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
      isPublished: true,
    })
      .select('title discountType discountValue storeId _id')
      .populate('storeId', 'name logo')
      .limit(Math.ceil(searchLimit * 0.2)) // 20% deals
      .lean();

    // Search categories
    const categories = await Category.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    })
      .select('name icon _id')
      .limit(Math.ceil(searchLimit * 0.1)) // 10% categories
      .lean();

    // Format suggestions
    const suggestions = [];

    // Add stores
    stores.forEach(store => {
      suggestions.push({
        id: store._id.toString(),
        type: 'store',
        name: store.name,
        category: 'Store',
        icon: '🛒',
        logo: store.logo,
        url: `/store/${store._id}`,
      });
    });

    // Add coupons
    coupons.forEach(coupon => {
      const discountText = coupon.discountType === 'percentage'
        ? `${coupon.discountValue}%`
        : `$${coupon.discountValue}`;
      
      suggestions.push({
        id: coupon._id.toString(),
        type: 'coupon',
        name: `${discountText} ${coupon.title || coupon.code}`,
        category: coupon.storeId?.name || 'Coupon',
        icon: '🎫',
        logo: coupon.storeId?.logo,
        code: coupon.code,
        url: `/coupons/${coupon._id}`,
      });
    });

    // Add deals
    deals.forEach(deal => {
      const discountText = deal.discountType === 'percentage'
        ? `${deal.discountValue}%`
        : `$${deal.discountValue}`;
      
      suggestions.push({
        id: deal._id.toString(),
        type: 'deal',
        name: `${discountText} ${deal.title}`,
        category: deal.storeId?.name || 'Deal',
        icon: '🔥',
        logo: deal.storeId?.logo,
        url: `/deals/${deal._id}`,
      });
    });

    // Add categories
    categories.forEach(category => {
      suggestions.push({
        id: category._id.toString(),
        type: 'category',
        name: category.name,
        category: 'Category',
        icon: category.icon || '📁',
        url: `/categories/${category._id}`,
      });
    });

    // Limit total results
    const limitedSuggestions = suggestions.slice(0, searchLimit);

    res.json({
      success: true,
      suggestions: limitedSuggestions,
      count: limitedSuggestions.length,
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching search suggestions',
      error: error.message,
    });
  }
};

/**
 * Full search across stores, coupons, and deals (scoped, server-side)
 * GET /api/v1/search?q=&limit=30&country=
 */
exports.search = async (req, res) => {
  try {
    const { q, country } = req.query;
    const regex = buildSearchRegex(q);
    if (!regex) {
      return res.json({ success: true, coupons: [], deals: [], stores: [], count: 0 });
    }

    const totalLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 60);
    const perType = Math.ceil(totalLimit / 3);
    const now = new Date();

    const storeFilter = {
      isActive: true,
      $or: [{ name: regex }, { description: regex }],
    };
    if (req.siteId) {
      storeFilter.$and = [
        { $or: [{ siteId: req.siteId }, { siteId: { $exists: false } }, { siteId: null }] },
      ];
    }

    const couponFilter = {
      isPublished: true,
      isActive: true,
      $and: [
        { $or: [{ title: regex }, { description: regex }, { code: regex }] },
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
            { endDate: { $exists: false } },
          ],
        },
      ],
    };
    if (req.siteId) couponFilter.siteId = req.siteId;

    const dealFilter = {
      isPublished: true,
      isActive: true,
      $and: [
        { $or: [{ title: regex }, { name: regex }, { description: regex }] },
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
            { endDate: { $exists: false } },
          ],
        },
      ],
    };
    if (req.siteId) dealFilter.siteId = req.siteId;

    const offerCountMaps = await loadStoreOfferCountMaps(req.siteId);
    const publishedStoreIds = offerCountMaps.storeIdsWithOffers
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (publishedStoreIds.length) {
      storeFilter._id = { $in: publishedStoreIds };
    } else {
      storeFilter._id = { $in: [] };
    }

    const [stores, coupons, deals] = await Promise.all([
      Store.find(storeFilter)
        .select('name slug logo description categoryId averageRating couponCount dealCount')
        .sort({ averageRating: -1, createdAt: -1 })
        .limit(perType)
        .lean(),
      Coupon.find(couponFilter)
        .select('_id title code slug discountValue discountType endDate storeId description')
        .populate('storeId', 'name slug logo')
        .sort({ createdAt: -1 })
        .limit(perType)
        .lean(),
      Deal.find(dealFilter)
        .select('_id title name slug discountValue discountType endDate store description')
        .populate('store', 'name slug logo')
        .sort({ createdAt: -1 })
        .limit(perType)
        .lean(),
    ]);

    let filteredStores = stores;
    let filteredCoupons = coupons;
    let filteredDeals = deals;

    if (country) {
      filteredStores = stores.filter((s) =>
        isCountryAvailable(country, s.availableCountries || [], s.isWorldwide !== false)
      );
      filteredCoupons = coupons.filter((c) =>
        isCountryAvailable(country, c.availableCountries || [], c.isWorldwide !== false)
      );
      filteredDeals = deals.filter((d) =>
        isCountryAvailable(country, d.availableCountries || [], d.isWorldwide !== false)
      );
    }

    return res.json({
      success: true,
      coupons: filteredCoupons,
      deals: filteredDeals,
      stores: filteredStores,
      count: filteredCoupons.length + filteredDeals.length + filteredStores.length,
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message,
    });
  }
};

/**
 * Get trending searches
 * Returns most searched terms (can be enhanced with search logs)
 */
exports.getTrendingSearches = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const searchLimit = parseInt(limit);

    // For now, return popular store names, coupon titles, and categories
    // TODO: Implement search logs to track actual trending searches
    
    // Get popular stores
    const popularStores = await Store.find({ isActive: true })
      .sort({ views: -1 })
      .limit(Math.ceil(searchLimit * 0.5))
      .select('name')
      .lean();

    // Get popular categories
    const popularCategories = await Category.find({ isActive: true })
      .sort({ views: -1 })
      .limit(Math.ceil(searchLimit * 0.3))
      .select('name')
      .lean();

    // Get popular coupon keywords
    const popularCoupons = await Coupon.find({ isActive: true })
      .sort({ usageCount: -1, views: -1 })
      .limit(Math.ceil(searchLimit * 0.2))
      .select('title code')
      .lean();

    // Combine and format trending searches
    const trending = [];

    popularStores.forEach(store => {
      trending.push(store.name);
    });

    popularCategories.forEach(category => {
      trending.push(category.name);
    });

    popularCoupons.forEach(coupon => {
      if (coupon.title) {
        trending.push(coupon.title);
      } else if (coupon.code) {
        trending.push(coupon.code);
      }
    });

    // Remove duplicates and limit
    const uniqueTrending = [...new Set(trending)].slice(0, searchLimit);

    res.json({
      success: true,
      trending: uniqueTrending,
      count: uniqueTrending.length,
    });
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending searches',
      error: error.message,
    });
  }
};


