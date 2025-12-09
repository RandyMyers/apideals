const View = require('../models/view');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');

/**
 * Extract language code from page path
 * @param {string} path - Page path (e.g., '/sv/coupons/all')
 * @returns {string} Language code (e.g., 'sv') or 'en' as default
 */
const extractLanguageCode = (path) => {
    if (!path || typeof path !== 'string') return 'en';
    
    const supportedLangs = ['en', 'sv', 'de', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT', 'ga', 'es', 'it', 'no', 'fi', 'da'];
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length > 0 && supportedLangs.includes(segments[0])) {
        return segments[0];
    }
    
    return 'en'; // default
};

exports.createView = async (req, res) => {
    try {
        const { visitorId, userId, storeId, couponId, dealId, categoryId, pagePath, languageCode, referrer } = req.body;
        const Visitor = require('../models/visitor');

        // Get userId from authenticated user if available
        const authenticatedUserId = req.user?.id || userId || null;

        // Auto-link to visitor if not provided: find visitor by IP and userAgent
        let finalVisitorId = visitorId;
        if (!finalVisitorId) {
            const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || req.body.userAgent;
            
            if (clientIp && userAgent) {
                const visitor = await Visitor.findOne({ ip: clientIp, userAgent })
                    .sort({ visitedAt: -1 })
                    .select('_id')
                    .lean();
                
                if (visitor) {
                    finalVisitorId = visitor._id;
                    // Update visitor userId if we have an authenticated user
                    if (authenticatedUserId) {
                        await Visitor.findByIdAndUpdate(visitor._id, { 
                            userId: authenticatedUserId 
                        }, { upsert: false });
                    }
                }
            }
        }

        // Determine entity type and ID
        let entityType = null;
        let entityId = null;
        let entityModel = null;

        if (storeId) {
            entityType = 'store';
            entityId = storeId;
            entityModel = 'Store';
        } else if (couponId) {
            entityType = 'coupon';
            entityId = couponId;
            entityModel = 'Coupon';
        } else if (dealId) {
            entityType = 'deal';
            entityId = dealId;
            entityModel = 'Deal';
        } else if (categoryId) {
            entityType = 'category';
            entityId = categoryId;
            entityModel = 'Category';
        }

        // Validate that at least one entity ID is provided
        if (!entityId || !entityType) {
            return res.status(400).json({
                message: 'At least one entity ID (storeId, couponId, dealId, or categoryId) is required',
            });
        }

        // Extract language code from pagePath if not provided
        let finalLanguageCode = languageCode;
        if (!finalLanguageCode && pagePath) {
            finalLanguageCode = extractLanguageCode(pagePath);
        }

        // Extract referrer from headers if not provided
        const finalReferrer = referrer || req.headers.referer || req.headers.referrer || null;

        // Determine if this is a landing page (first view in last 30 minutes for this visitor)
        let isLandingPage = false;
        if (finalVisitorId) {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const previousViews = await View.countDocuments({
                visitorId: finalVisitorId,
                viewedAt: { $gte: thirtyMinutesAgo }
            });
            isLandingPage = previousViews === 0;
        } else if (authenticatedUserId) {
            // For logged-in users without visitorId, check by userId
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const previousViews = await View.countDocuments({
                userId: authenticatedUserId,
                viewedAt: { $gte: thirtyMinutesAgo }
            });
            isLandingPage = previousViews === 0;
        } else {
            // For anonymous users without visitorId, assume it's a landing page
            isLandingPage = true;
        }

        // Create a new View entry
        const view = new View({
            visitorId: finalVisitorId || null,
            userId: authenticatedUserId, // Use authenticated user ID if available
            entityType,
            entityId,
            entityModel,
            storeId, // Keep for backward compatibility
            couponId, // Keep for backward compatibility
            dealId, // Keep for backward compatibility
            categoryId, // Keep for backward compatibility
            pagePath: pagePath || null, // Full URL path
            languageCode: finalLanguageCode || null, // Language prefix
            referrer: finalReferrer, // HTTP referrer
            isLandingPage, // First page in session
        });

        // Save to the database
        await view.save();

        // Emit Socket.IO event for real-time updates
        try {
            const socketService = require('../services/socketService');
            // Populate visitor data for the event
            const populatedView = await View.findById(view._id)
                .populate('visitorId', 'country deviceType platform')
                .populate('userId', 'username email')
                .lean();
            
            socketService.emitToAdmin('newView', {
                view: populatedView,
                timestamp: new Date()
            });
        } catch (socketError) {
            // Don't fail view creation if Socket.IO fails
            console.warn('Error emitting Socket.IO event:', socketError);
        }

        // Also increment the views counter on the entity (for quick queries and trending)
        try {
            if (couponId) {
                await Coupon.findByIdAndUpdate(couponId, { $inc: { views: 1 } });
            } else if (dealId) {
                await Deal.findByIdAndUpdate(dealId, { $inc: { views: 1 } });
            } else if (storeId) {
                await Store.findByIdAndUpdate(storeId, { $inc: { views: 1 } });
            } else if (categoryId) {
                await Category.findByIdAndUpdate(categoryId, { $inc: { views: 1 } });
            }
        } catch (incrementError) {
            // Log but don't fail the view tracking if increment fails
            console.warn('Error incrementing views counter:', incrementError);
        }

        res.status(201).json({
            message: 'View logged successfully',
            view,
        });
    } catch (error) {
        console.error('Error logging view:', error);
        res.status(500).json({
            message: 'Error logging view',
            error: error.message,
        });
    }
};

exports.getAllViews = async (req, res) => {
    try {
        const views = await View.find()
            .populate('visitorId') // Populate visitor details
            .populate('storeId')   // Populate store details
            .populate('couponId')  // Populate coupon details
            .populate('dealId')    // Populate deal details
            .populate('categoryId') // Populate category details
            .sort({ viewedAt: -1 }); // Sort by most recent views

        res.status(200).json(views);
    } catch (error) {
        console.error('Error fetching views:', error);
        res.status(500).json({
            message: 'Error fetching views',
            error,
        });
    }
};

exports.getViewsByVisitor = async (req, res) => {
    try {
        const { visitorId } = req.params;

        const views = await View.find({ visitorId })
            .populate('visitorId')
            .populate('storeId')
            .populate('couponId')
            .populate('dealId')
            .populate('categoryId')
            .sort({ viewedAt: -1 });

        res.status(200).json(views);
    } catch (error) {
        console.error('Error fetching views by visitor:', error);
        res.status(500).json({
            message: 'Error fetching views by visitor',
            error,
        });
    }
};

exports.deleteView = async (req, res) => {
    try {
        const { id } = req.params;

        const view = await View.findByIdAndDelete(id);

        if (!view) {
            return res.status(404).json({ message: 'View not found' });
        }

        res.status(200).json({ message: 'View deleted successfully' });
    } catch (error) {
        console.error('Error deleting view:', error);
        res.status(500).json({ message: 'Error deleting view', error });
    }
};

exports.deleteViewsByVisitor = async (req, res) => {
    try {
        const { visitorId } = req.params;

        const result = await View.deleteMany({ visitorId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No views found for the specified visitor' });
        }

        res.status(200).json({
            message: `All views for visitor with ID: ${visitorId} deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting views by visitor:', error);
        res.status(500).json({ message: 'Error deleting views by visitor', error });
    }
};

