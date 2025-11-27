const Deal = require('../models/deal'); // Assuming the model is located in models/Deal.js
const Subscription = require('../models/subscriptions');
const Store = require('../models/store');
const User = require('../models/user');
const cloudinary = require('cloudinary').v2;
const { isCountryAvailable } = require('../utils/countryUtils');
const notificationService = require('../services/notificationService');

// Create a new deal
exports.createDeal = async (req, res) => {
  try {
    const { userId, storeId, imageUrl, categoryId, subscriptionId, ...dealData } = req.body;

    console.log(req.body);

    // Ensure required fields are provided
    if (!userId || !storeId || !categoryId) {
      return res.status(400).json({ message: 'UserId, StoreId, and Category are required.' });
    }

    // Fetch the user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { userType } = user;

    if (!imageUrl) {
      if (req.files && req.files.image) {
        const image = req.files.image;
        const uploadResult = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'deals', // Optional folder in Cloudinary
        });
        imageUrl = uploadResult.secure_url; // Get the secure URL for the uploaded image
      } else {
        // Fetch store details to retrieve the logo as fallback
        const store = await Store.findById(storeId);
        if (store && store.logo) {
          imageUrl = store.logo;
        }
      }
    }

    // Allow superAdmin and couponManager to bypass subscription limits
    if (userType === 'superAdmin' || userType === 'couponManager') {
      const { availableCountries, isWorldwide, ...restDealData } = dealData;
      const newDeal = new Deal({ 
        store: storeId, 
        categoryId, 
        imageUrl,
        subscriptionId,
        availableCountries: availableCountries || ['WORLDWIDE'],
        isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
        ...restDealData,
        imageUrl,
      });
      await newDeal.save();

      // Notify store followers about new deal (non-blocking)
      try {
        const store = await Store.findById(storeId).select('name followers').lean();
        
        if (store && store.followers && store.followers.length > 0 && newDeal.isActive) {
          const discountText = newDeal.discountType === 'percentage' 
            ? `${newDeal.discountValue}% off`
            : `$${newDeal.discountValue} off`;
          
          await notificationService.sendBulkNotifications(
            store.followers.map(f => f.toString()),
            'deal_available',
            {
              storeName: store.name,
              dealTitle: newDeal.title || newDeal.name,
              discount: discountText
            },
            { actionUrl: `/deals/${newDeal._id}` }
          );
        }
      } catch (notifError) {
        console.error('Error sending follower notification for new deal:', notifError);
        // Don't fail creation if notification fails
      }

      return res.status(201).json({ message: 'Deal created successfully', deal: newDeal });
    }

    // Validate subscription for regular users
    if (!subscriptionId) {
      return res.status(400).json({ message: 'SubscriptionId is required for regular users.' });
    }

    const userSubscription = await Subscription.findById(subscriptionId);
    if (!userSubscription) {
      return res.status(404).json({ message: 'Subscription not found.' });
    }

    // Enforce deal creation limits
    if (userSubscription.dealCount >= userSubscription.dealLimit) {
      return res.status(403).json({
        message: `Deal creation limit reached. You can create up to ${userSubscription.dealLimit} deals.`,
      });
    }

    // Create a new deal
    const { availableCountries, isWorldwide, ...restDealData } = dealData;
    const newDeal = new Deal({ 
      store: storeId, 
      categoryId, 
      imageUrl,
      subscriptionId,
      availableCountries: availableCountries || ['WORLDWIDE'],
      isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
      ...restDealData,
      imageUrl,
    });
    await newDeal.save();

    // Increment the deal count in the subscription
    userSubscription.dealCount = (userSubscription.dealCount || 0) + 1;
    await userSubscription.save();

    // Notify store followers about new deal (non-blocking)
    try {
      const store = await Store.findById(storeId).select('name followers').lean();
      
      if (store && store.followers && store.followers.length > 0 && newDeal.isActive) {
        const discountText = newDeal.discountType === 'percentage' 
          ? `${newDeal.discountValue}% off`
          : `$${newDeal.discountValue} off`;
        
        await notificationService.sendBulkNotifications(
          store.followers.map(f => f.toString()),
          'deal_available',
          {
            storeName: store.name,
            dealTitle: newDeal.title || newDeal.name,
            discount: discountText
          },
          { actionUrl: `/deals/${newDeal._id}` }
        );
      }
    } catch (notifError) {
      console.error('Error sending follower notification for new deal:', notifError);
      // Don't fail creation if notification fails
    }

    // Send notification to admins about new deal (non-blocking)
    try {
      const adminUsers = await User.find({ 
        userType: { $in: ['superAdmin', 'couponManager'] } 
      }).select('_id');
      
      if (adminUsers.length > 0) {
        const adminIds = adminUsers.map(admin => admin._id.toString());
        const user = await User.findById(userId).select('username');
        const store = await Store.findById(storeId).select('name');
        await notificationService.sendBulkNotifications(
          adminIds,
          'deal_submitted',
          { 
            dealTitle: newDeal.title || newDeal.name || 'New Deal',
            userName: user?.username || 'User',
            storeName: store?.name || 'Store'
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending admin notification for deal creation:', notifError);
      // Don't fail deal creation if notification fails
    }

    res.status(201).json({ message: 'Deal created successfully', deal: newDeal });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ message: 'Error creating deal', error: error.message });
  }
};

// Bulk upsert deals
exports.bulkUpsert = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.items) ? req.body.items : []);
    if (!items.length) return res.status(400).json({ message: 'No items provided' });
    let created = 0, updated = 0, errors = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.store || !it.categoryId || !it.name) { errors.push({ i, message:'Missing required fields' }); continue; }
      try {
        const doc = await Deal.findOneAndUpdate(
          { name: it.name, store: it.store },
          { ...it, updatedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (doc.createdAt && (Date.now()-doc.createdAt.getTime()) < 2000) created++; else updated++;
      } catch(e){ errors.push({ i, message: e.message }); }
    }
    res.json({ created, updated, errors });
  } catch (error) {
    res.status(500).json({ message: 'Bulk upsert failed', error: error.message });
  }
};

// Get all deals (public - only active deals)
exports.getAllDeals = async (req, res) => {
  try {
    const { country } = req.query; // Visitor country for location filtering
    const now = new Date();
    let deals = await Deal.find({
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { endDate: { $exists: false } }
      ]
    })
    .populate('store', 'name website logo')
    .sort({ createdAt: -1 })
    .lean();
    
    // Filter by location if country is provided
    if (country) {
      deals = deals.filter(deal => 
        isCountryAvailable(country, deal.availableCountries || [], deal.isWorldwide !== false)
      );
    }

    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deals', error: error.message });
  }
};

// Get a single deal by ID
exports.getDealById = async (req, res) => {
  const { id } = req.params;
  const { country } = req.query; // Visitor country for location filtering
  try {
    const deal = await Deal.findById(id).lean();
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Check if deal is available in visitor's country
    if (country && !isCountryAvailable(country, deal.availableCountries || [], deal.isWorldwide !== false)) {
      return res.status(403).json({ 
        message: 'This deal is not available in your location',
        availableCountries: deal.availableCountries
      });
    }

    res.status(200).json(deal);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deal', error: error.message });
  }
};

// Get deals by userId
exports.getDealsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    // Ensure userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required.' });
    }

    // Fetch deals created by the user
    const userDeals = await Deal.find({ userId }).populate('store categoryId');

    if (!userDeals.length) {
      return res.status(404).json({ message: 'No deals found for this user.' });
    }

    res.status(200).json(userDeals);
  } catch (error) {
    console.error('Error fetching deals by userId:', error);
    res.status(500).json({ message: 'Error fetching deals', error: error.message });
  }
};


// Update a deal by ID
exports.updateDeal = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    // Get the deal before update to check if isActive is changing
    const oldDeal = await Deal.findById(id);
    if (!oldDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const wasInactive = !oldDeal.isActive;
    const willBeActive = updatedData.isActive === true;

    const updatedDeal = await Deal.findByIdAndUpdate(id, updatedData, { new: true });
    if (!updatedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Send notification if deal was approved (changed from inactive to active) and has a userId
    if (wasInactive && willBeActive && updatedDeal.userId) {
      try {
        await notificationService.createNotification(
          updatedDeal.userId,
          'deal_approved',
          { 
            dealTitle: updatedDeal.title || updatedDeal.name || 'Your Deal'
          },
          { actionUrl: `/deals/${updatedDeal._id}` }
        );
      } catch (notifError) {
        console.error('Error sending deal approval notification:', notifError);
        // Don't fail deal update if notification fails
      }
    }

    // Notify store followers about new/approved deal (non-blocking)
    if (willBeActive && updatedDeal.store) {
      try {
        const Store = require('../models/store');
        const store = await Store.findById(updatedDeal.store).select('name followers').lean();
        
        if (store && store.followers && store.followers.length > 0) {
          const discountText = updatedDeal.discountType === 'percentage' 
            ? `${updatedDeal.discountValue}% off`
            : `$${updatedDeal.discountValue} off`;
          
          await notificationService.sendBulkNotifications(
            store.followers.map(f => f.toString()),
            'deal_available',
            {
              storeName: store.name,
              dealTitle: updatedDeal.title || updatedDeal.name,
              discount: discountText
            },
            { actionUrl: `/deals/${updatedDeal._id}` }
          );
        }
      } catch (notifError) {
        console.error('Error sending follower notification for new deal:', notifError);
        // Don't fail update if notification fails
      }
    }

    res.status(200).json({ message: 'Deal updated successfully', deal: updatedDeal });
  } catch (error) {
    res.status(500).json({ message: 'Error updating deal', error: error.message });
  }
};

// Delete a deal by ID
exports.deleteDeal = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedDeal = await Deal.findByIdAndDelete(id);
    if (!deletedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting deal', error: error.message });
  }
};

// Check if a deal is valid
exports.checkDealValidity = async (req, res) => {
  const { id } = req.params;
  try {
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const isValid = deal.isValid();
    res.status(200).json({ message: isValid ? 'Deal is valid' : 'Deal is not valid' });
  } catch (error) {
    res.status(500).json({ message: 'Error checking deal validity', error: error.message });
  }
};

// Increment usage count of a deal
exports.incrementDealUsage = async (req, res) => {
  const { id } = req.params;
  try {
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    if (!deal.isValid()) {
      return res.status(400).json({ message: 'Deal cannot be used (invalid or expired)' });
    }

    await deal.incrementUsage();
    res.status(200).json({ message: 'Deal usage incremented successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error incrementing deal usage', error: error.message });
  }
};
