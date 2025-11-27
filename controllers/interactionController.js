const Interaction = require('../models/interaction'); // Path to your Interaction model

// 1. Create a new interaction entry
exports.createInteraction = async (req, res) => {
    try {
        const { visitorId, type, storeId, couponId, dealId, categoryId } = req.body;

        // Create a new Interaction
        const interaction = new Interaction({
            visitorId,
            type,
            storeId,
            couponId,
            dealId,
            categoryId,
        });

        // Save the interaction to the database
        await interaction.save();

        res.status(201).json({
            message: 'Interaction created successfully',
            interaction,
        });
    } catch (error) {
        console.error('Error creating interaction:', error);
        res.status(500).json({
            message: 'Error creating interaction',
            error,
        });
    }
};

// 2. Get all interactions
exports.getAllInteractions = async (req, res) => {
    try {
        const interactions = await Interaction.find()
            .populate('visitorId') // Optionally populate visitor data
            .populate('storeId') // Populate store details
            .populate('couponId') // Populate coupon details
            .populate('dealId') // Populate deal details
            .populate('categoryId') // Populate category details
            .sort({ interactionAt: -1 }); // Sort by interaction date (latest first)

        res.status(200).json(interactions);
    } catch (error) {
        console.error('Error fetching interactions:', error);
        res.status(500).json({
            message: 'Error fetching interactions',
            error,
        });
    }
};

// 3. Get all interactions for a specific visitor
exports.getInteractionsByVisitorId = async (req, res) => {
    try {
        const { visitorId } = req.params;

        const interactions = await Interaction.find({ visitorId })
            .populate('visitorId') // Optionally populate visitor data
            .populate('storeId')
            .populate('couponId')
            .populate('dealId')
            .populate('categoryId')
            .sort({ interactionAt: -1 });

        if (interactions.length === 0) {
            return res.status(404).json({
                message: `No interactions found for visitor with ID: ${visitorId}`,
            });
        }

        res.status(200).json(interactions);
    } catch (error) {
        console.error('Error fetching interactions by visitor:', error);
        res.status(500).json({
            message: 'Error fetching interactions by visitor',
            error,
        });
    }
};

// 4. Get all interactions for a specific type (e.g., store, coupon, deal, category)
exports.getInteractionsByType = async (req, res) => {
    try {
        const { type, id } = req.params;

        // Dynamically construct query based on type
        const query = {};
        if (type === 'store') query.storeId = id;
        if (type === 'coupon') query.couponId = id;
        if (type === 'deal') query.dealId = id;
        if (type === 'category') query.categoryId = id;

        const interactions = await Interaction.find(query)
            .populate('visitorId')
            .populate('storeId')
            .populate('couponId')
            .populate('dealId')
            .populate('categoryId')
            .sort({ interactionAt: -1 });

        if (interactions.length === 0) {
            return res.status(404).json({
                message: `No interactions found for type: ${type} with ID: ${id}`,
            });
        }

        res.status(200).json(interactions);
    } catch (error) {
        console.error('Error fetching interactions by type:', error);
        res.status(500).json({
            message: 'Error fetching interactions by type',
            error,
        });
    }
};

// 5. Delete a specific interaction by ID
exports.deleteInteraction = async (req, res) => {
    try {
        const { id } = req.params;

        const interaction = await Interaction.findByIdAndDelete(id);

        if (!interaction) {
            return res.status(404).json({ message: 'Interaction not found' });
        }

        res.status(200).json({ message: 'Interaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting interaction:', error);
        res.status(500).json({ message: 'Error deleting interaction', error });
    }
};

// 6. Delete all interactions for a specific visitor
exports.deleteInteractionsByVisitorId = async (req, res) => {
    try {
        const { visitorId } = req.params;

        // Delete all interactions for the specified visitor
        const result = await Interaction.deleteMany({ visitorId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No interactions found for the specified visitor' });
        }

        res.status(200).json({
            message: `All interactions for visitor with ID: ${visitorId} deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting interactions by visitor:', error);
        res.status(500).json({ message: 'Error deleting interactions by visitor', error });
    }
};

// 7. Get saved items for a user (interactions with type='saved')
exports.getSavedItems = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id; // Get user ID from auth middleware
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Find saved interactions for this user
        // Note: This assumes visitorId can also reference User._id
        const savedInteractions = await Interaction.find({
            visitorId: userId,
            type: 'saved'
        })
            .populate('couponId')
            .populate('dealId')
            .populate('storeId')
            .sort({ interactionAt: -1 });

        // Format the response
        const items = savedInteractions.map(interaction => ({
            _id: interaction._id,
            type: interaction.couponId ? 'coupon' : (interaction.dealId ? 'deal' : 'store'),
            item: interaction.couponId || interaction.dealId || interaction.storeId,
            savedAt: interaction.interactionAt
        })).filter(item => item.item); // Filter out null items

        res.status(200).json({ items });
    } catch (error) {
        console.error('Error fetching saved items:', error);
        res.status(500).json({ message: 'Error fetching saved items', error });
    }
};

// 8. Save an item (create interaction with type='saved')
exports.saveItem = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { couponId, dealId, storeId } = req.body;

        // Check if already saved
        const existing = await Interaction.findOne({
            visitorId: userId,
            type: 'saved',
            ...(couponId && { couponId }),
            ...(dealId && { dealId }),
            ...(storeId && { storeId })
        });

        if (existing) {
            return res.status(200).json({ 
                message: 'Item already saved',
                interaction: existing 
            });
        }

        // Create new saved interaction
        const interaction = new Interaction({
            visitorId: userId,
            type: 'saved',
            couponId: couponId || null,
            dealId: dealId || null,
            storeId: storeId || null
        });

        await interaction.save();
        await interaction.populate('couponId dealId storeId');

        res.status(201).json({
            message: 'Item saved successfully',
            interaction
        });
    } catch (error) {
        console.error('Error saving item:', error);
        res.status(500).json({ message: 'Error saving item', error });
    }
};

// 9. Unsave an item (delete saved interaction)
exports.unsaveItem = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { couponId, dealId, storeId } = req.body;

        const result = await Interaction.deleteOne({
            visitorId: userId,
            type: 'saved',
            ...(couponId && { couponId }),
            ...(dealId && { dealId }),
            ...(storeId && { storeId })
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Saved item not found' });
        }

        res.status(200).json({ message: 'Item unsaved successfully' });
    } catch (error) {
        console.error('Error unsaving item:', error);
        res.status(500).json({ message: 'Error unsaving item', error });
    }
};