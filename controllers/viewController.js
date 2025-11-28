const View = require('../models/view');

exports.createView = async (req, res) => {
    try {
        const { visitorId, userId, storeId, couponId, dealId, categoryId } = req.body;

        // Get userId from authenticated user if available
        const authenticatedUserId = req.user?.id || userId || null;

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

        // Create a new View entry
        const view = new View({
            visitorId: visitorId || null,
            userId: authenticatedUserId, // Use authenticated user ID if available
            entityType,
            entityId,
            entityModel,
            storeId, // Keep for backward compatibility
            couponId, // Keep for backward compatibility
            dealId, // Keep for backward compatibility
            categoryId, // Keep for backward compatibility
        });

        // Save to the database
        await view.save();

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

