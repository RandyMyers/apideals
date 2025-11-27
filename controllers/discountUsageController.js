const DiscountUsage = require('../models/discountUsage');

// Record a new discount usage
exports.recordDiscountUsage = async (req, res) => {
  try {
    const { subscriptionId, discountId } = req.body;

    const discountUsage = new DiscountUsage({
      subscriptionId,
      discountId,
      usedAt: new Date(),
      status: 'used',
    });

    const savedDiscountUsage = await discountUsage.save();

    res.status(201).json(savedDiscountUsage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all discount usages
exports.getAllDiscountUsages = async (req, res) => {
  try {
    const discountUsages = await DiscountUsage.find()
      .populate('subscriptionId', 'planId userId')
      .populate('discountId', 'code value type');

    res.status(200).json(discountUsages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific discount usage by ID
exports.getDiscountUsageById = async (req, res) => {
  try {
    const discountUsage = await DiscountUsage.findById(req.params.id)
      .populate('subscriptionId', 'planId userId')
      .populate('discountId', 'code value type');

    if (!discountUsage) {
      return res.status(404).json({ message: 'Discount usage not found' });
    }

    res.status(200).json(discountUsage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a discount usage
exports.updateDiscountUsage = async (req, res) => {
  try {
    const { status } = req.body;

    const discountUsage = await DiscountUsage.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!discountUsage) {
      return res.status(404).json({ message: 'Discount usage not found' });
    }

    res.status(200).json(discountUsage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a discount usage
exports.deleteDiscountUsage = async (req, res) => {
  try {
    const discountUsage = await DiscountUsage.findByIdAndDelete(req.params.id);

    if (!discountUsage) {
      return res.status(404).json({ message: 'Discount usage not found' });
    }

    res.status(204).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


