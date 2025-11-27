const Visitor = require('../models/visitor');


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

// Delete a visitor by ID (along with related data)
exports.deleteVisitor = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete related page views and interactions
        const View = require('../models/view');
        const Interaction = require('../models/interaction');
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
