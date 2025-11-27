const Affiliate = require('../models/affiliate');

// Create a new affiliate
exports.createAffiliate = async (req, res) => {
    try {
        const { name, website, description, affiliateId } = req.body;

        // Check if the affiliate name already exists
        const existingAffiliate = await Affiliate.findOne({ name });
        if (existingAffiliate) {
            return res.status(400).json({ message: 'Affiliate with this name already exists' });
        }

        const affiliate = new Affiliate({ name, website, description, affiliateId });
        await affiliate.save();

        res.status(201).json({
            message: 'Affiliate created successfully',
            affiliate,
        });
    } catch (error) {
        console.error('Error creating affiliate:', error);
        res.status(500).json({
            message: 'Error creating affiliate',
            error,
        });
    }
};

// Get all affiliates
exports.getAllAffiliates = async (req, res) => {
    try {
        const affiliates = await Affiliate.find().sort({ createdAt: -1 }); // Sort by most recently created
        res.status(200).json(affiliates);
    } catch (error) {
        console.error('Error fetching affiliates:', error);
        res.status(500).json({
            message: 'Error fetching affiliates',
            error,
        });
    }
};

// Get a single affiliate by ID
exports.getAffiliateById = async (req, res) => {
    try {
        const { id } = req.params;
        const affiliate = await Affiliate.findById(id);

        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate not found' });
        }

        res.status(200).json(affiliate);
    } catch (error) {
        console.error('Error fetching affiliate by ID:', error);
        res.status(500).json({
            message: 'Error fetching affiliate by ID',
            error,
        });
    }
};

// Update an affiliate
exports.updateAffiliate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, website, description, affiliateId } = req.body;

        const affiliate = await Affiliate.findByIdAndUpdate(
            id,
            { name, website, description, affiliateId },
            { new: true, runValidators: true } // Return the updated document and validate input
        );

        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate not found' });
        }

        res.status(200).json({
            message: 'Affiliate updated successfully',
            affiliate,
        });
    } catch (error) {
        console.error('Error updating affiliate:', error);
        res.status(500).json({
            message: 'Error updating affiliate',
            error,
        });
    }
};

// Delete an affiliate
exports.deleteAffiliate = async (req, res) => {
    try {
        const { id } = req.params;

        const affiliate = await Affiliate.findByIdAndDelete(id);

        if (!affiliate) {
            return res.status(404).json({ message: 'Affiliate not found' });
        }

        res.status(200).json({ message: 'Affiliate deleted successfully' });
    } catch (error) {
        console.error('Error deleting affiliate:', error);
        res.status(500).json({
            message: 'Error deleting affiliate',
            error,
        });
    }
};
