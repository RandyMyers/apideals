const Discount = require('../models/discount');

// 1. Create a New Discount
exports.createDiscount = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, applicableTo, isActive, startDate, endDate } = req.body;

    // Validate required fields
    if (!code || !discountType || !discountValue || !startDate || !endDate) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // Check if the discount code already exists
    const existingDiscount = await Discount.findOne({ code });
    if (existingDiscount) {
      return res.status(400).json({ message: 'Discount code already exists.' });
    }

    // Create new discount
    const discount = new Discount({
      code,
      description,
      discountType,
      discountValue,
      applicableTo,
      isActive,
      startDate,
      endDate,
    });

    await discount.save();
    res.status(201).json({ message: 'Discount created successfully.', discount });
  } catch (error) {
    res.status(500).json({ message: 'Error creating discount.', error: error.message });
  }
};

// 2. Get All Discounts
exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find();
    res.status(200).json(discounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discounts.', error: error.message });
  }
};

// 3. Get a Single Discount by ID
exports.getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id);

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    res.status(200).json(discount);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discount.', error: error.message });
  }
};

// 4. Update a Discount
exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const discount = await Discount.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    res.status(200).json({ message: 'Discount updated successfully.', discount });
  } catch (error) {
    res.status(500).json({ message: 'Error updating discount.', error: error.message });
  }
};

// 5. Delete a Discount
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByIdAndDelete(id);

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    res.status(200).json({ message: 'Discount deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting discount.', error: error.message });
  }
};

// 6. Get Active Discounts
exports.getActiveDiscounts = async (req, res) => {
  try {
    const currentDate = new Date();
    const activeDiscounts = await Discount.find({
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    res.status(200).json(activeDiscounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active discounts.', error: error.message });
  }
};

// 7. Validate a Discount Code
exports.validateDiscountCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Discount code is required.' });
    }

    const currentDate = new Date();
    const discount = await Discount.findOne({
      code,
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    if (!discount) {
      return res.status(404).json({ message: 'Invalid or expired discount code.' });
    }

    res.status(200).json({ message: 'Discount code is valid.', discount });
  } catch (error) {
    res.status(500).json({ message: 'Error validating discount code.', error: error.message });
  }
};

// 8. Toggle Discount Status
exports.toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id);

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found.' });
    }

    // Toggle the discount's active status
    discount.isActive = !discount.isActive;
    await discount.save();

    res.status(200).json({ message: 'Discount status updated successfully.', discount });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling discount status.', error: error.message });
  }
};
