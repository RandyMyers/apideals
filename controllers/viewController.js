const View = require('../models/view');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const Blog = require('../models/blog');

function detectDeviceType(userAgent = '', platform = '') {
    const ua = String(userAgent || '').toLowerCase();
    const pf = String(platform || '').toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet')) return 'Tablet';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) return 'Mobile';
    if (pf.includes('mac') || pf.includes('win') || pf.includes('linux') || ua.includes('desktop')) return 'Desktop';
    return 'Desktop';
}

/** Resolve entity identifier (slug or ObjectId) to canonical ObjectId. */
async function resolveEntityId(model, idOrSlug, slugField = 'slug') {
    if (!idOrSlug) return null;
    const raw = String(idOrSlug).trim();
    if (/^[0-9a-fA-F]{24}$/.test(raw)) return raw;
    const doc = await model.findOne({ [slugField]: raw }).select('_id').lean();
    return doc?._id || null;
}

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
        console.log('📥 Received createView request:', {
            visitorId: req.body.visitorId,
            userId: req.body.userId,
            storeId: req.body.storeId,
            couponId: req.body.couponId,
            dealId: req.body.dealId,
            categoryId: req.body.categoryId,
            blogId: req.body.blogId,
            pagePath: req.body.pagePath,
            languageCode: req.body.languageCode
        });
        
        const {
            visitorId,
            userId,
            storeId,
            couponId,
            dealId,
            categoryId,
            blogId,
            pagePath,
            languageCode,
            referrer,
            userAgent: bodyUserAgent,
            browserLanguage,
            platform,
            trackingKey,
        } = req.body;
        const Visitor = require('../models/visitor');

        // Get userId from authenticated user if available
        const authenticatedUserId = req.user?.id || userId || null;

        // Auto-link to visitor if not provided: find visitor by IP and userAgent
        let finalVisitorId = visitorId;
        if (!finalVisitorId && trackingKey) {
            const trackedVisitor = await Visitor.findOne({ trackingKey }).select('_id userId').lean();
            if (trackedVisitor?._id) {
                finalVisitorId = trackedVisitor._id;
                if (authenticatedUserId && !trackedVisitor.userId) {
                    await Visitor.findByIdAndUpdate(trackedVisitor._id, { userId: authenticatedUserId }, { upsert: false });
                }
            }
        }
        if (!finalVisitorId) {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress;
            const userAgent = bodyUserAgent || req.headers['user-agent'] || null;
            
            if (clientIp && userAgent) {
                // First try exact IP + UA match, then progressively relax.
                let visitor = await Visitor.findOne({ ip: clientIp, userAgent })
                    .sort({ visitedAt: -1 })
                    .select('_id')
                    .lean();

                if (!visitor) {
                    visitor = await Visitor.findOne({
                        userAgent,
                        ...(browserLanguage ? { browserLanguage } : {}),
                        ...(platform ? { platform } : {}),
                    })
                        .sort({ visitedAt: -1 })
                        .select('_id')
                        .lean();
                }
                
                if (visitor) {
                    finalVisitorId = visitor._id;
                    // Update visitor userId if we have an authenticated user
                    if (authenticatedUserId) {
                        await Visitor.findByIdAndUpdate(visitor._id, { 
                            userId: authenticatedUserId 
                        }, { upsert: false });
                    }
                } else {
                    // Ensure every view is linked to a visitor record.
                    try {
                        const fallbackVisitor = await Visitor.create({
                            userId: authenticatedUserId || undefined,
                            trackingKey: trackingKey || undefined,
                            ip: clientIp,
                            country: 'Unknown',
                            userAgent,
                            browserLanguage: browserLanguage || undefined,
                            platform: platform || undefined,
                            deviceType: detectDeviceType(userAgent, platform),
                            city: null,
                            region: null,
                            timezone: null,
                        });
                        finalVisitorId = fallbackVisitor._id;
                    } catch (createErr) {
                        // If unique index races, grab latest matching record and continue.
                        const fallbackExisting = await Visitor.findOne({
                            ip: clientIp,
                            userAgent,
                        })
                            .sort({ visitedAt: -1 })
                            .select('_id')
                            .lean();
                        finalVisitorId = fallbackExisting?._id || null;
                    }
                }
            }
        }

        // Resolve incoming IDs (slug or ObjectId) to canonical ObjectIds
        const resolvedStoreId = storeId ? await resolveEntityId(Store, storeId) : null;
        const resolvedCouponId = couponId ? await resolveEntityId(Coupon, couponId) : null;
        const resolvedDealId = dealId ? await resolveEntityId(Deal, dealId) : null;
        const resolvedCategoryId = categoryId ? await resolveEntityId(Category, categoryId) : null;
        const resolvedBlogId = blogId ? await resolveEntityId(Blog, blogId) : null;

        // Determine entity type and ID
        let entityType = null;
        let entityId = null;
        let entityModel = null;

        if (resolvedStoreId) {
            entityType = 'store';
            entityId = resolvedStoreId;
            entityModel = 'Store';
        } else if (resolvedCouponId) {
            entityType = 'coupon';
            entityId = resolvedCouponId;
            entityModel = 'Coupon';
        } else if (resolvedDealId) {
            entityType = 'deal';
            entityId = resolvedDealId;
            entityModel = 'Deal';
        } else if (resolvedCategoryId) {
            entityType = 'category';
            entityId = resolvedCategoryId;
            entityModel = 'Category';
        } else if (resolvedBlogId) {
            entityType = 'blog';
            entityId = resolvedBlogId;
            entityModel = 'Blog';
        }

        // Allow page views without entity IDs (for general pages like homepage, blog, etc.)
        // If no entity ID is provided, we'll track it as a general page view
        if (!entityId || !entityType) {
            // This is a general page view (homepage, blog listing, etc.)
            entityType = 'page';
            entityId = null;
            entityModel = null;
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
            entityType: entityType || null,
            entityId: entityId || null,
            entityModel: entityModel || null,
            storeId: resolvedStoreId || null, // Keep for backward compatibility
            couponId: resolvedCouponId || null, // Keep for backward compatibility
            dealId: resolvedDealId || null, // Keep for backward compatibility
            categoryId: resolvedCategoryId || null, // Keep for backward compatibility
            blogId: resolvedBlogId || null, // Keep for backward compatibility
            pagePath: pagePath || null, // Full URL path
            languageCode: finalLanguageCode || null, // Language prefix
            referrer: finalReferrer || null, // HTTP referrer
            isLandingPage, // First page in session
        });

        // Save to the database
        await view.save();

        // Emit Socket.IO event for real-time updates
        try {
            const socketService = require('../services/socketService');
            // Populate visitor data for the event
            const populatedView = await View.findById(view._id)
                .populate('visitorId', 'country deviceType platform ip city')
                .populate('userId', 'username email')
                .lean();
            
            // Ensure pagePath and languageCode are included
            if (!populatedView.pagePath && pagePath) {
                populatedView.pagePath = pagePath;
            }
            if (!populatedView.languageCode && finalLanguageCode) {
                populatedView.languageCode = finalLanguageCode;
            }
            if (!populatedView.referrer && finalReferrer) {
                populatedView.referrer = finalReferrer;
            }
            
            console.log('📊 Emitting newView event for view:', {
                viewId: view._id,
                entityType: entityType,
                entityId: entityId,
                visitorId: populatedView.visitorId?._id || populatedView.visitorId,
                userId: populatedView.userId?._id || populatedView.userId,
                pagePath: populatedView.pagePath,
                languageCode: populatedView.languageCode
            });
            
            socketService.emitToAdmin('newView', {
                view: {
                    ...populatedView,
                    pagePath: populatedView.pagePath,
                    languageCode: populatedView.languageCode,
                    referrer: populatedView.referrer,
                    viewedAt: populatedView.viewedAt || populatedView.createdAt
                },
                timestamp: new Date()
            });
        } catch (socketError) {
            // Don't fail view creation if Socket.IO fails
            console.warn('Error emitting Socket.IO event:', socketError);
        }

        // Also increment the views counter on the entity (for quick queries and trending)
        try {
            if (resolvedCouponId) {
                await Coupon.findByIdAndUpdate(resolvedCouponId, { $inc: { views: 1 } });
            } else if (resolvedDealId) {
                await Deal.findByIdAndUpdate(resolvedDealId, { $inc: { views: 1 } });
            } else if (resolvedStoreId) {
                await Store.findByIdAndUpdate(resolvedStoreId, { $inc: { views: 1 } });
            } else if (resolvedCategoryId) {
                await Category.findByIdAndUpdate(resolvedCategoryId, { $inc: { views: 1 } });
            } else if (resolvedBlogId) {
                await Blog.findByIdAndUpdate(resolvedBlogId, { $inc: { views: 1 } });
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

