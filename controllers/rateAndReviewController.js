const RateAndReview = require('../models/rateAndReview');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const { calculateStoreRating } = require('../services/storeRatingService');

// Create a new rating and review
exports.createRateAndReview = async (req, res) => {
    try {
        // Get userId from auth middleware if available, otherwise from body
        const userId = req.user?.id || req.user?._id || req.user?.userId || req.body.userId;
        const { couponId, dealId, rating, reviewText } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User authentication required.' });
        }

        if (!couponId && !dealId) {
            return res.status(400).json({ message: 'Either couponId or dealId must be provided.' });
        }

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Get storeId from coupon or deal
        let storeId = null;
        if (couponId) {
            const coupon = await Coupon.findById(couponId).select('storeId').lean();
            if (!coupon) {
                return res.status(404).json({ message: 'Coupon not found.' });
            }
            storeId = coupon.storeId;
        } else if (dealId) {
            const deal = await Deal.findById(dealId).select('store').lean();
            if (!deal) {
                return res.status(404).json({ message: 'Deal not found.' });
            }
            storeId = deal.store;
        }

        const rateAndReview = new RateAndReview({
            userId,
            couponId,
            dealId,
            rating,
            reviewText,
        });

        await rateAndReview.save();

        // Calculate and update store rating (non-blocking)
        if (storeId) {
            calculateStoreRating(storeId).catch(err => {
                console.error('Error updating store rating after review creation:', err);
            });
        }

        res.status(201).json({
            message: 'Rating and review created successfully.',
            rateAndReview,
        });
    } catch (error) {
        console.error('Error creating rating and review:', error);
        res.status(500).json({
            message: 'Error creating rating and review.',
            error: error.message,
        });
    }
};

// Get all ratings and reviews
exports.getAllRatingsAndReviews = async (req, res) => {
    try {
        const ratingsAndReviews = await RateAndReview.find()
            .populate('userId', 'username') // Populate only username (privacy: no email)
            .populate('couponId')            // Populate coupon details
            .populate('dealId')              // Populate deal details
            .sort({ createdAt: -1 });        // Sort by newest first

        res.status(200).json(ratingsAndReviews);
    } catch (error) {
        console.error('Error fetching ratings and reviews:', error);
        res.status(500).json({
            message: 'Error fetching ratings and reviews.',
            error,
        });
    }
};

// Get ratings and reviews for a specific coupon
exports.getRatingsAndReviewsByCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const ratingsAndReviews = await RateAndReview.find({ couponId })
            .populate('userId', 'username') // Populate only username (privacy: no email)
            .sort({ createdAt: -1 });

        res.status(200).json(ratingsAndReviews);
    } catch (error) {
        console.error('Error fetching ratings and reviews for coupon:', error);
        res.status(500).json({
            message: 'Error fetching ratings and reviews for coupon.',
            error,
        });
    }
};

// Get ratings and reviews for a specific deal
exports.getRatingsAndReviewsByDeal = async (req, res) => {
    try {
        const { dealId } = req.params;

        const ratingsAndReviews = await RateAndReview.find({ dealId })
            .populate('userId', 'username') // Populate only username (privacy: no email)
            .sort({ createdAt: -1 });

        res.status(200).json(ratingsAndReviews);
    } catch (error) {
        console.error('Error fetching ratings and reviews for deal:', error);
        res.status(500).json({
            message: 'Error fetching ratings and reviews for deal.',
            error,
        });
    }
};

// Update a rating and review
exports.updateRateAndReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, reviewText } = req.body;

        // Get existing review to find storeId
        const existingReview = await RateAndReview.findById(id);
        if (!existingReview) {
            return res.status(404).json({ message: 'Rating and review not found.' });
        }

        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        const rateAndReview = await RateAndReview.findByIdAndUpdate(
            id,
            { rating, reviewText, updatedAt: Date.now() },
            { new: true }
        );

        // Get storeId from coupon or deal
        let storeId = null;
        if (rateAndReview.couponId) {
            const coupon = await Coupon.findById(rateAndReview.couponId).select('storeId').lean();
            storeId = coupon?.storeId;
        } else if (rateAndReview.dealId) {
            const deal = await Deal.findById(rateAndReview.dealId).select('store').lean();
            storeId = deal?.store;
        }

        // Recalculate store rating (non-blocking)
        if (storeId) {
            calculateStoreRating(storeId).catch(err => {
                console.error('Error updating store rating after review update:', err);
            });
        }

        res.status(200).json({
            message: 'Rating and review updated successfully.',
            rateAndReview,
        });
    } catch (error) {
        console.error('Error updating rating and review:', error);
        res.status(500).json({
            message: 'Error updating rating and review.',
            error: error.message,
        });
    }
};

// Delete a rating and review
exports.deleteRateAndReview = async (req, res) => {
    try {
        const { id } = req.params;

        // Get review before deleting to find storeId
        const rateAndReview = await RateAndReview.findById(id);
        if (!rateAndReview) {
            return res.status(404).json({ message: 'Rating and review not found.' });
        }

        // Get storeId from coupon or deal before deletion
        let storeId = null;
        if (rateAndReview.couponId) {
            const coupon = await Coupon.findById(rateAndReview.couponId).select('storeId').lean();
            storeId = coupon?.storeId;
        } else if (rateAndReview.dealId) {
            const deal = await Deal.findById(rateAndReview.dealId).select('store').lean();
            storeId = deal?.store;
        }

        // Delete the review
        await RateAndReview.findByIdAndDelete(id);

        // Recalculate store rating (non-blocking)
        if (storeId) {
            calculateStoreRating(storeId).catch(err => {
                console.error('Error updating store rating after review deletion:', err);
            });
        }

        res.status(200).json({ message: 'Rating and review deleted successfully.' });
    } catch (error) {
        console.error('Error deleting rating and review:', error);
        res.status(500).json({
            message: 'Error deleting rating and review.',
            error: error.message,
        });
    }
};

// Get current user's reviews
exports.getMyReviews = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const reviews = await RateAndReview.find({ userId })
            .populate('couponId', 'title code')
            .populate('dealId', 'title name')
            .sort({ createdAt: -1 });

        res.status(200).json({ reviews });
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({
            message: 'Error fetching user reviews.',
            error,
        });
    }
};