const Subscription = require('../models/subscriptions');
const SubscriptionPlan = require('../models/subscriptionPlan');
const notificationService = require('../services/notificationService');
const User = require('../models/user');

// Create a new subscription
exports.createSubscription = async (req, res) => {
  try {
    const { userId, planId, paymentLinkId, startDate, endDate } = req.body;

    // Fetch the subscription plan details
    const subscriptionPlan = await SubscriptionPlan.findById(planId);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const { couponLimit, dealLimit, storeLimit } = subscriptionPlan; // Fetch limits from the plan

    const subscription = new Subscription({
      userId,
      planId,
      paymentLinkId,
      startDate,
      endDate,
      nextBillingDate: endDate, // Example: next billing matches the current end date
      couponLimit,
      dealLimit,
      storeLimit,
    });

    const savedSubscription = await subscription.save();

    // Send notification when subscription is activated (non-blocking)
    if (savedSubscription.status === 'active') {
      try {
        await notificationService.createNotification(
          userId,
          'subscription_active',
          {},
          { actionUrl: '/dashboard/subscription' }
        );
      } catch (notifError) {
        console.error('Error sending subscription activation notification:', notifError);
      }
    }

    res.status(201).json(savedSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'name email') // Adjust fields as per User schema
      .populate('planId', 'name price')
      .populate('paymentLinkId', 'paymentMethod details');

    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('planId', 'name price')
      .populate('paymentLinkId', 'paymentMethod details');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { status, endDate, nextBillingDate, lastPaymentDate } = req.body;

    const existingSubscription = await Subscription.findById(req.params.id);
    if (!existingSubscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      {
        status,
        endDate,
        nextBillingDate,
        lastPaymentDate,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    // Send notification if subscription status changed to active (non-blocking)
    if (status === 'active' && existingSubscription.status !== 'active') {
      try {
        await notificationService.createNotification(
          subscription.userId,
          'subscription_active',
          {},
          { actionUrl: '/dashboard/subscription' }
        );
      } catch (notifError) {
        console.error('Error sending subscription activation notification:', notifError);
      }
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.changeSubscription = async (req, res) => {
  try {
    const { id } = req.params; // Subscription ID
    const { newPlanId, paymentLinkId } = req.body; // New plan ID and payment link

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Fetch the details of the new subscription plan
    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({ message: 'New subscription plan not found' });
    }

    // Update subscription with the new plan details
    subscription.planId = newPlanId;
    subscription.paymentLinkId = paymentLinkId;
    subscription.updatedAt = Date.now();

    // Update limits and features based on the new plan
    subscription.couponLimit = newPlan.couponLimit;
    subscription.dealLimit = newPlan.dealLimit;
    subscription.storeLimit = newPlan.storeLimit;

    // Update end date based on the new plan's billing cycle (e.g., monthly)
    const currentEndDate = subscription.endDate;
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1); // Assuming monthly for simplicity
    subscription.endDate = newEndDate;

    const updatedSubscription = await subscription.save();

    res.status(200).json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Renew a subscription with updated limits from plan
exports.renewSubscription = async (req, res) => {
  try {
    const { id } = req.params; // Subscription ID
    const { paymentLinkId } = req.body; // Payment link for renewal

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Fetch the associated subscription plan details
    const subscriptionPlan = await SubscriptionPlan.findById(subscription.planId);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const { couponLimit, dealLimit, storeLimit } = subscriptionPlan;

    // Calculate new end and billing dates
    const currentEndDate = subscription.endDate;
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1); // Assuming a monthly renewal

    subscription.endDate = newEndDate;
    subscription.nextBillingDate = newEndDate;
    subscription.status = 'active';
    subscription.paymentLinkId = paymentLinkId;
    subscription.couponLimit = couponLimit; // Reset based on the plan
    subscription.dealLimit = dealLimit;
    subscription.storeLimit = storeLimit;
    subscription.updatedAt = Date.now();

    const updatedSubscription = await subscription.save();

    res.status(200).json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
  

// Delete a subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscriptions by user ID
exports.getSubscriptionsByUserId = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.params.userId })
      .populate('planId', 'name price')
      .populate('paymentLinkId', 'paymentMethod details');

    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark subscription as expired
exports.expireSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'expired', updatedAt: Date.now() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user's subscriptions
exports.getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const subscriptions = await Subscription.find({ userId })
      .populate('planId', 'name price couponLimit dealLimit storeLimit')
      .populate('paymentLinkId')
      .sort({ createdAt: -1 });

    res.status(200).json({ subscriptions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscription usage stats
exports.getSubscriptionUsage = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { subscriptionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || subscription.userId.toString() !== userId.toString()) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Count actual usage
    const Store = require('../models/store');
    const Coupon = require('../models/coupon');
    const Deal = require('../models/deal');

    const [storeCount, couponCount, dealCount] = await Promise.all([
      Store.countDocuments({ userId }),
      Coupon.countDocuments({ userId }),
      Deal.countDocuments({ userId })
    ]);

    res.status(200).json({
      subscription,
      usage: {
        storesUsed: storeCount,
        storesLimit: subscription.storeLimit,
        couponsUsed: couponCount,
        couponsLimit: subscription.couponLimit,
        dealsUsed: dealCount,
        dealsLimit: subscription.dealLimit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
