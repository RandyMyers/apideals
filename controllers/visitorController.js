const Visitor = require('../models/visitor');
const View = require('../models/view');
const Interaction = require('../models/interaction');
const CouponUsage = require('../models/couponUsage');


exports.createVisitor = async (req, res) => {
    try {
        const { userId, ip, userAgent, referralCode } = req.body;

        // Check if a visitor with the same IP and User-Agent exists
        let visitor = await Visitor.findOne({ ip, userAgent });

        if (visitor) {
            // Update visit count and timestamp
            visitor.visitCount += 1;
            visitor.visitedAt = new Date();

            // Link userId if not already set
            if (!visitor.userId) {
                visitor.userId = userId;
            }

            if (referralCode && !visitor.referralCode) {
                visitor.referralCode = referralCode; // Update referral code if it's not already set
            }

            await visitor.save();
            return res.status(200).json({
                message: 'Visitor record updated',
                visitor,
            });
        }

        // Create a new visitor record for unique IP and User-Agent combination
        const {
            city,
            region,
            country,
            continent,
            zipCode,
            population,
            currency,
            currencyName,
            languages,
            latitude,
            longitude,
            timezone,
            browserLanguage,
            platform,
            deviceType,
            
        } = req.body;

        const newVisitor = new Visitor({
            userId,
            ip,
            city,
            region,
            country,
            continent,
            zipCode,
            population,
            currency,
            currencyName,
            languages,
            latitude,
            longitude,
            timezone,
            userAgent,
            browserLanguage,
            platform,
            deviceType,
            referralCode
        });

        await newVisitor.save();
        return res.status(201).json({
            message: 'New visitor record created',
            visitor: newVisitor,
        });
    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Visitor with this IP and User-Agent already exists',
            });
        }

        console.error('Error creating/updating visitor:', error);
        return res.status(500).json({ message: 'Error creating/updating visitor', error });
    }
};



// Retrieve all visitors
exports.getAllVisitors = async (req, res) => {
    try {
        const visitors = await Visitor.find().sort({ visitedAt: -1 }); // Sort by the latest visit
        res.status(200).json(visitors);
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({ message: 'Error fetching visitors', error });
    }
};

// Retrieve a single visitor by ID
exports.getVisitorById = async (req, res) => {
    try {
        const { id } = req.params;
        const visitor = await Visitor.findById(id);

        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        res.status(200).json(visitor);
    } catch (error) {
        console.error('Error fetching visitor:', error);
        res.status(500).json({ message: 'Error fetching visitor', error });
    }
};

// Retrieve unified activity timeline for a visitor
exports.getVisitorActivityById = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100 } = req.query;

        const visitor = await Visitor.findById(id).lean();
        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        const cap = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));

        const [views, interactions] = await Promise.all([
            View.find({ visitorId: id })
                .populate('storeId', 'name')
                .populate('couponId', 'title code')
                .populate('dealId', 'title name')
                .sort({ viewedAt: -1 })
                .limit(cap)
                .lean(),
            Interaction.find({ visitorId: id })
                .populate('storeId', 'name')
                .populate('couponId', 'title code')
                .populate('dealId', 'title name')
                .sort({ interactionAt: -1 })
                .limit(cap)
                .lean(),
        ]);

        let usages = [];
        if (visitor.userId) {
            usages = await CouponUsage.find({ userId: visitor.userId, worked: true })
                .populate('storeId', 'name')
                .populate('entityId', 'title name code')
                .sort({ usedAt: -1 })
                .limit(cap)
                .lean();
        }

        const timeline = [
            ...views.map((v) => ({
                type: 'view',
                timestamp: v.viewedAt || v.createdAt,
                pagePath: v.pagePath || null,
                pageTitle: v.pageTitle || null,
                languageCode: v.languageCode || null,
                referrer: v.referrer || null,
                store: v.storeId || null,
                coupon: v.couponId || null,
                deal: v.dealId || null,
                raw: v,
            })),
            ...interactions.map((i) => ({
                type: 'interaction',
                interactionType: i.interactionType || i.type || null,
                timestamp: i.interactionAt || i.createdAt,
                pagePath: i.pagePath || null,
                languageCode: i.languageCode || null,
                store: i.storeId || null,
                coupon: i.couponId || null,
                deal: i.dealId || null,
                raw: i,
            })),
            ...usages.map((u) => ({
                type: 'usage',
                timestamp: u.usedAt || u.createdAt,
                savingsAmount: u.savingsAmount || 0,
                entityType: u.entityType || null,
                store: u.storeId || null,
                entity: u.entityId || null,
                raw: u,
            })),
        ]
            .filter((x) => x.timestamp)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, cap);

        const pageMap = new Map();
        views.forEach((v) => {
            if (!v.pagePath) return;
            const current = pageMap.get(v.pagePath) || { pagePath: v.pagePath, count: 0, lastViewed: null };
            current.count += 1;
            const viewedAt = v.viewedAt || v.createdAt;
            if (!current.lastViewed || new Date(viewedAt) > new Date(current.lastViewed)) {
                current.lastViewed = viewedAt;
            }
            pageMap.set(v.pagePath, current);
        });

        const pagesVisited = Array.from(pageMap.values()).sort((a, b) => b.count - a.count);

        return res.status(200).json({
            visitor,
            summary: {
                totalViews: views.length,
                totalInteractions: interactions.length,
                totalUsages: usages.length,
                uniquePages: pagesVisited.length,
            },
            pagesVisited,
            timeline,
        });
    } catch (error) {
        console.error('Error fetching visitor activity:', error);
        return res.status(500).json({ message: 'Error fetching visitor activity', error: error.message });
    }
};

// Delete a visitor by ID (along with related data)
exports.deleteVisitor = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete related page views and interactions
        await View.deleteMany({ visitorId: id });
        await Interaction.deleteMany({ visitorId: id });

        // Delete the visitor
        const result = await Visitor.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        res.status(200).json({ message: 'Visitor and related data deleted successfully' });
    } catch (error) {
        console.error('Error deleting visitor:', error);
        res.status(500).json({ message: 'Error deleting visitor', error });
    }
};

/**
 * Get list of all countries from visitor data
 * Returns unique countries sorted by visitor count
 * This is the ONLY source of countries for location targeting
 */
exports.getVisitorCountries = async (req, res) => {
    try {
        // Aggregate visitors by country
        const countryStats = await Visitor.aggregate([
            {
                $match: {
                    country: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$country',
                    count: { $sum: 1 },
                    uniqueIPs: { $addToSet: '$ip' }
                }
            },
            {
                $project: {
                    country: '$_id',
                    count: 1,
                    uniqueVisitors: { $size: '$uniqueIPs' },
                    _id: 0
                }
            },
            {
                $sort: { count: -1 } // Sort by total visits (most popular first)
            }
        ]);

        // Extract country data - these are the ONLY countries available for targeting
        const countries = countryStats.map(stat => ({
            country: stat.country,
            visitorCount: stat.count,
            uniqueVisitorCount: stat.uniqueVisitors
        }));

        // If no countries found, return empty array (not an error)
        // This means no visitors have accessed the site yet
        res.status(200).json({
            success: true,
            totalCountries: countries.length,
            message: countries.length === 0 
                ? 'No visitor data available yet. Countries will appear as visitors access the site.'
                : `Found ${countries.length} countries from visitor data.`,
            data: countries
        });
    } catch (error) {
        console.error('Error fetching visitor countries:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching visitor countries',
            error: error.message
        });
    }
};
