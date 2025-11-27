/**
 * Store Rating Service
 * Calculates and updates store ratings based on reviews of coupons and deals
 */

const Store = require('../models/store');
const RateAndReview = require('../models/rateAndReview');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');

/**
 * Calculate and update store rating from all coupon/deal reviews
 * @param {String} storeId - Store ID
 * @returns {Promise<Object>} Updated rating data
 */
const calculateStoreRating = async (storeId) => {
  try {
    // Find all coupons and deals for this store
    const coupons = await Coupon.find({ storeId, isActive: true }).select('_id').lean();
    const deals = await Deal.find({ store: storeId, isActive: true }).select('_id').lean();
    
    const couponIds = coupons.map(c => c._id);
    const dealIds = deals.map(d => d._id);
    
    // Find all reviews for these coupons and deals
    const reviews = await RateAndReview.find({
      $or: [
        { couponId: { $in: couponIds } },
        { dealId: { $in: dealIds } }
      ]
    }).select('rating').lean();
    
    // Calculate average rating and count
    let averageRating = 0;
    let ratingCount = 0;
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = totalRating / reviews.length;
      ratingCount = reviews.length;
    }
    
    // Update store document
    const store = await Store.findByIdAndUpdate(
      storeId,
      {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount
      },
      { new: true }
    );
    
    if (!store) {
      throw new Error('Store not found');
    }
    
    return {
      averageRating: store.averageRating,
      ratingCount: store.ratingCount
    };
  } catch (error) {
    console.error('Error calculating store rating:', error);
    throw error;
  }
};

/**
 * Recalculate ratings for all stores (for migration/maintenance)
 * @returns {Promise<Object>} Summary of updates
 */
const recalculateAllStoreRatings = async () => {
  try {
    const stores = await Store.find({ isActive: true }).select('_id').lean();
    const results = {
      total: stores.length,
      updated: 0,
      errors: 0
    };
    
    for (const store of stores) {
      try {
        await calculateStoreRating(store._id);
        results.updated++;
      } catch (error) {
        console.error(`Error calculating rating for store ${store._id}:`, error);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error recalculating all store ratings:', error);
    throw error;
  }
};

module.exports = {
  calculateStoreRating,
  recalculateAllStoreRatings
};

