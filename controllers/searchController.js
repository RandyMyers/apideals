/**
 * Search Controller
 * Handles search suggestions and trending searches
 */

const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');

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


