const SubscriptionPlan = require('../models/subscriptionPlan');

// 1. Create a New Subscription Plan
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { name, description, price, couponLimit, creditsPerMonth, accessToAnalytics, promoteCoupons, features, highlight, order, colorTheme, isActive } = req.body;

    // Validate required fields
    if (!name || !description || !price.monthly || !price.yearly || couponLimit === undefined || order === undefined) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    // Check if the plan name already exists
    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: 'Subscription plan name already exists.' });
    }

    // Create new subscription plan
    const subscriptionPlan = new SubscriptionPlan({
      name,
      description,
      price,
      couponLimit,
      creditsPerMonth,
      accessToAnalytics,
      promoteCoupons,
      features,
      highlight,
      order,
      colorTheme,
      isActive,
    });

    await subscriptionPlan.save();
    res.status(201).json({ message: 'Subscription plan created successfully.', subscriptionPlan });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error creating subscription plan.', error: error.message });
  }
};

// 2. Get All Subscription Plans
exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription plans.', error: error.message });
  }
};

// 3. Get a Single Subscription Plan by ID
exports.getSubscriptionPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    res.status(200).json(subscriptionPlan);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription plan.', error: error.message });
  }
};

// 4. Update a Subscription Plan
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const subscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    res.status(200).json({ message: 'Subscription plan updated successfully.', subscriptionPlan });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subscription plan.', error: error.message });
  }
};

// 5. Delete a Subscription Plan
exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriptionPlan = await SubscriptionPlan.findByIdAndDelete(id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    res.status(200).json({ message: 'Subscription plan deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subscription plan.', error: error.message });
  }
};

// 6. Get Active Subscription Plans
exports.getActiveSubscriptionPlans = async (req, res) => {
  try {
    const activePlans = await SubscriptionPlan.find({ isActive: true });
    res.status(200).json(activePlans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active subscription plans.', error: error.message });
  }
};

// 7. Toggle Subscription Plan Status
exports.toggleSubscriptionPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriptionPlan = await SubscriptionPlan.findById(id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found.' });
    }

    // Toggle the subscription plan's active status
    subscriptionPlan.isActive = !subscriptionPlan.isActive;
    await subscriptionPlan.save();

    res.status(200).json({ message: 'Subscription plan status updated successfully.', subscriptionPlan });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling subscription plan status.', error: error.message });
  }
};
