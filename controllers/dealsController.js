const Deal = require('../models/deal'); // Assuming the model is located in models/Deal.js
const Subscription = require('../models/subscriptions');
const Store = require('../models/store');
const User = require('../models/user');
const View = require('../models/view');
const Interaction = require('../models/interaction');
const RateAndReview = require('../models/rateAndReview');
const Vote = require('../models/vote');
const CouponUsage = require('../models/couponUsage');
const cloudinary = require('cloudinary').v2;
const { isCountryAvailable } = require('../utils/countryUtils');
const notificationService = require('../services/notificationService');

// Create a new deal
exports.createDeal = async (req, res) => {
  try {
    // Allow body to use either admin-friendly field names (store, category)
    // or API-native ones (storeId, categoryId). Also support optional auth user.
    let { userId, storeId, imageUrl, categoryId, subscriptionId, ...dealData } = req.body;

    console.log(req.body);

    // Map alternative field names from body (e.g. admin UI sends `store` and `category`)
    if (!storeId && dealData.store) {
      storeId = dealData.store;
      delete dealData.store;
    }
    if (!categoryId && dealData.category) {
      categoryId = dealData.category;
      delete dealData.category;
    }

    // Fallback userId from auth middleware if available
    if (!userId && req.user) {
      userId = req.user._id ? req.user._id.toString() : req.user.id;
    }

    // Ensure required fields are provided
    if (!userId || !storeId || !categoryId) {
      return res.status(400).json({ message: 'UserId, StoreId, and Category are required.' });
    }

    // Validate dealType and discount fields
    if (dealData.dealType === 'discount') {
      // Clean empty strings to undefined for optional fields
      if (dealData.discountType === '' || !dealData.discountType) {
        return res.status(400).json({ message: 'Discount Type is required when Deal Type is "discount".' });
      }
      if (!dealData.discountValue || dealData.discountValue === '') {
        return res.status(400).json({ message: 'Discount Value is required when Deal Type is "discount".' });
      }
      // Ensure discountType is valid enum value
      if (!['percentage', 'fixed'].includes(dealData.discountType)) {
        return res.status(400).json({ message: 'Discount Type must be either "percentage" or "fixed".' });
      }
      // Convert discountValue to number
      dealData.discountValue = Number(dealData.discountValue);
      if (isNaN(dealData.discountValue) || dealData.discountValue <= 0) {
        return res.status(400).json({ message: 'Discount Value must be a positive number.' });
      }
    } else {
      // Remove discount fields if not a discount deal
      delete dealData.discountType;
      delete dealData.discountValue;
    }

    // Validate dates
    if (dealData.startDate && dealData.endDate) {
      const startDate = new Date(dealData.startDate);
      const endDate = new Date(dealData.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for startDate or endDate.' });
      }
      if (endDate < startDate) {
        return res.status(400).json({ message: 'End date must be after start date.' });
      }
    }

    // Calculate savings if price fields are provided
    if (dealData.originalPrice && dealData.discountedPrice) {
      const original = Number(dealData.originalPrice);
      const discounted = Number(dealData.discountedPrice);
      if (!isNaN(original) && !isNaN(discounted) && original > 0 && discounted > 0) {
        dealData.savingsAmount = original - discounted;
        dealData.savingsPercentage = ((dealData.savingsAmount / original) * 100).toFixed(2);
      }
    }

    // Clean empty strings from optional fields
    Object.keys(dealData).forEach(key => {
      if (dealData[key] === '') {
        delete dealData[key];
      }
    });

    // Fetch the user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { userType } = user;

    // Process main image
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

    // Process image gallery
    let imageGallery = [];
    if (req.files) {
      const galleryFiles = Object.keys(req.files)
        .filter(key => key.startsWith('galleryImage_'))
        .sort((a, b) => {
          const idxA = parseInt(a.split('_')[1]);
          const idxB = parseInt(b.split('_')[1]);
          return idxA - idxB;
        })
        .map(key => req.files[key]);

      if (galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length; i++) {
          const file = galleryFiles[i];
          try {
            const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'deals/gallery',
            });
            imageGallery.push({
              url: uploadResult.secure_url,
              alt: dealData.name || dealData.title || `Deal image ${i + 1}`,
              order: i,
            });
          } catch (galleryError) {
            console.error(`Error uploading gallery image ${i}:`, galleryError);
            // Continue with other images even if one fails
          }
        }
      }
    }

    // Process array fields (highlights, features, tags, seoKeywords)
    let highlights = [];
    if (dealData.highlights) {
      try {
        highlights = typeof dealData.highlights === 'string' 
          ? JSON.parse(dealData.highlights)
          : (Array.isArray(dealData.highlights) ? dealData.highlights : []);
      } catch (e) {
        console.warn('Could not parse highlights, using empty array');
      }
    }

    let features = [];
    if (dealData.features) {
      try {
        features = typeof dealData.features === 'string' 
          ? JSON.parse(dealData.features)
          : (Array.isArray(dealData.features) ? dealData.features : []);
      } catch (e) {
        console.warn('Could not parse features, using empty array');
      }
    }

    let tags = [];
    if (dealData.tags) {
      try {
        tags = typeof dealData.tags === 'string' 
          ? JSON.parse(dealData.tags)
          : (Array.isArray(dealData.tags) ? dealData.tags : []);
      } catch (e) {
        console.warn('Could not parse tags, using empty array');
      }
    }

    let seoKeywords = [];
    if (dealData.seoKeywords) {
      try {
        seoKeywords = typeof dealData.seoKeywords === 'string' 
          ? JSON.parse(dealData.seoKeywords)
          : (Array.isArray(dealData.seoKeywords) ? dealData.seoKeywords : []);
      } catch (e) {
        console.warn('Could not parse seoKeywords, using empty array');
      }
    }

    // Allow superAdmin and couponManager to bypass subscription limits
    if (userType === 'superAdmin' || userType === 'couponManager') {
      const { 
        availableCountries, 
        isWorldwide, 
        highlights: highlightsRaw,
        features: featuresRaw,
        tags: tagsRaw,
        seoKeywords: seoKeywordsRaw,
        ...restDealData 
      } = dealData;
      
      // Default isPublished - admins can publish immediately, regular users default to false
      const defaultIsPublished = userType === 'superAdmin' || userType === 'couponManager'
        ? (dealData.isPublished !== undefined ? dealData.isPublished : true)
        : false;
      
      const newDeal = new Deal({ 
        store: storeId, 
        categoryId, 
        imageUrl,
        subscriptionId,
        imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
        highlights: highlights.length > 0 ? highlights : undefined,
        features: features.length > 0 ? features : undefined,
        tags: tags.length > 0 ? tags : undefined,
        seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
        availableCountries: availableCountries || ['WORLDWIDE'],
        isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
        isPublished: defaultIsPublished,
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
    const { 
      availableCountries, 
      isWorldwide, 
      highlights: highlightsRaw,
      features: featuresRaw,
      tags: tagsRaw,
      seoKeywords: seoKeywordsRaw,
      ...restDealData 
    } = dealData;
    
    // Default isPublished - regular users default to false
    const defaultIsPublished = dealData.isPublished !== undefined ? dealData.isPublished : false;
    
    const newDeal = new Deal({ 
      store: storeId, 
      categoryId, 
      imageUrl,
      subscriptionId,
      imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
      highlights: highlights.length > 0 ? highlights : undefined,
      features: features.length > 0 ? features : undefined,
      tags: tags.length > 0 ? tags : undefined,
      seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
      availableCountries: availableCountries || ['WORLDWIDE'],
      isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
      isPublished: defaultIsPublished,
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
    const { country, admin } = req.query; // Visitor country for location filtering, admin flag to show all
    const now = new Date();
    
    // Build query - if admin=true, show all deals (including expired/inactive/unpublished)
    // Otherwise, only show published, active, and non-expired deals
    const query = admin === 'true' 
      ? {} // Admin sees all deals
      : {
          isPublished: true,
          isActive: true,
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
            { endDate: { $exists: false } }
          ]
        };
    
    let deals = await Deal.find(query)
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
    console.error('Error fetching deals:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching deals', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get a single deal by ID
exports.getDealById = async (req, res) => {
  const { id } = req.params;
  const { country } = req.query; // Visitor country for location filtering
  try {
    const deal = await Deal.findById(id)
      .populate('store', 'name website logo rating followers')
      .populate('categoryId', 'name slug')
      .populate('affiliate', 'name')
      .populate('userId', 'username')
      .populate({
        path: 'relatedDealIds',
        select: 'name imageUrl discountValue discountType startDate endDate title',
        populate: {
          path: 'store',
          select: 'name logo',
          strictPopulate: false
        },
        strictPopulate: false
      })
      .populate({
        path: 'relatedCouponIds',
        select: 'code discountValue discountType startDate endDate imageUrl title',
        populate: {
          path: 'storeId',
          select: 'name logo',
          strictPopulate: false
        },
        strictPopulate: false
      })
      .lean();
    
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

    // If imageGallery is empty but imageUrl exists, create gallery from single image
    if ((!deal.imageGallery || deal.imageGallery.length === 0) && deal.imageUrl) {
      deal.imageGallery = [{
        url: deal.imageUrl,
        alt: deal.name || deal.title || 'Deal image',
        order: 0,
      }];
    }

    // Format variations for JSON response (convert Map to plain object)
    if (deal.isVariableProduct && deal.variations && Array.isArray(deal.variations)) {
      deal.variations = deal.variations.map(v => {
        const variation = { ...v };
        // Convert attributes Map to plain object
        if (v.attributes && v.attributes instanceof Map) {
          variation.attributes = Object.fromEntries(v.attributes);
        } else if (v.attributes && typeof v.attributes === 'object') {
          // Already an object, keep as is
          variation.attributes = v.attributes;
        }
        return variation;
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
  let updatedData = req.body;
  
  try {
    // Handle FormData - if content-type is multipart/form-data, parse it
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // FormData parsing is handled by multer middleware
      // Extract JSON fields if they exist
      if (req.body.languageData) {
        try {
          updatedData.languageTranslations = typeof req.body.languageData === 'string' 
            ? JSON.parse(req.body.languageData) 
            : req.body.languageData;
        } catch (e) {
          console.warn('Failed to parse languageData:', e);
        }
      }
      
      // Process array fields
      if (req.body.highlights && typeof req.body.highlights === 'string') {
        try {
          updatedData.highlights = JSON.parse(req.body.highlights);
        } catch (e) {
          updatedData.highlights = req.body.highlights.split('\n').filter(item => item.trim());
        }
      }
      if (req.body.features && typeof req.body.features === 'string') {
        try {
          updatedData.features = JSON.parse(req.body.features);
        } catch (e) {
          updatedData.features = req.body.features.split('\n').filter(item => item.trim());
        }
      }
      if (req.body.tags && typeof req.body.tags === 'string') {
        try {
          updatedData.tags = JSON.parse(req.body.tags);
        } catch (e) {
          updatedData.tags = req.body.tags.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      if (req.body.seoKeywords && typeof req.body.seoKeywords === 'string') {
        try {
          updatedData.seoKeywords = JSON.parse(req.body.seoKeywords);
        } catch (e) {
          updatedData.seoKeywords = req.body.seoKeywords.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      
      // Parse imageGallery if it's a JSON string
      if (req.body.imageGallery && typeof req.body.imageGallery === 'string') {
        try {
          updatedData.imageGallery = JSON.parse(req.body.imageGallery);
        } catch (e) {
          console.warn('Failed to parse imageGallery:', e);
          // If parsing fails, try to keep existing gallery or set to empty array
          updatedData.imageGallery = [];
        }
      }
      
      // Parse entityTags if it's a JSON string
      if (req.body.entityTags && typeof req.body.entityTags === 'string') {
        try {
          const parsed = JSON.parse(req.body.entityTags);
          updatedData.entityTags = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // If it's just "[]" or empty, set to empty array
          if (req.body.entityTags.trim() === '[]' || req.body.entityTags.trim() === '') {
            updatedData.entityTags = [];
          } else {
            // Try splitting by comma as fallback
            updatedData.entityTags = req.body.entityTags.split(',').map(item => item.trim()).filter(item => item);
          }
        }
      }
      
      // Parse specifications if it's a JSON string
      if (req.body.specifications && typeof req.body.specifications === 'string') {
        try {
          updatedData.specifications = JSON.parse(req.body.specifications);
        } catch (e) {
          console.warn('Failed to parse specifications:', e);
          // Keep as string if parsing fails
        }
      }
      
      // Remove storeId if present (only use store field)
      if (updatedData.storeId && !updatedData.store) {
        updatedData.store = updatedData.storeId;
      }
      delete updatedData.storeId;
      
      // Remove category if present (only use categoryId field)
      if (updatedData.category && !updatedData.categoryId) {
        updatedData.categoryId = updatedData.category;
      }
      delete updatedData.category;
    }
    
    // Convert date strings to Date objects
    if (updatedData.startDate && typeof updatedData.startDate === 'string') {
      updatedData.startDate = new Date(updatedData.startDate);
    }
    if (updatedData.endDate && typeof updatedData.endDate === 'string') {
      updatedData.endDate = new Date(updatedData.endDate);
    }
    if (updatedData.expiryDate && typeof updatedData.expiryDate === 'string') {
      updatedData.expiryDate = new Date(updatedData.expiryDate);
    }

    // Handle boolean fields from form data (they come as strings)
    console.log('🔍 Before boolean conversion - isActive:', updatedData.isActive, 'type:', typeof updatedData.isActive);
    console.log('🔍 Before boolean conversion - isPublished:', updatedData.isPublished, 'type:', typeof updatedData.isPublished);
    
    if (updatedData.isActive !== undefined && updatedData.isActive !== null) {
      updatedData.isActive = updatedData.isActive === 'true' || updatedData.isActive === true;
    }
    if (updatedData.isPublished !== undefined && updatedData.isPublished !== null) {
      updatedData.isPublished = updatedData.isPublished === 'true' || updatedData.isPublished === true;
    }
    
    console.log('✅ After boolean conversion - isActive:', updatedData.isActive, 'type:', typeof updatedData.isActive);
    console.log('✅ After boolean conversion - isPublished:', updatedData.isPublished, 'type:', typeof updatedData.isPublished);

    // Convert numeric fields
    if (updatedData.discountValue !== undefined) {
      updatedData.discountValue = Number(updatedData.discountValue);
    }
    if (updatedData.originalPrice !== undefined) {
      updatedData.originalPrice = Number(updatedData.originalPrice) || 0;
    }
    if (updatedData.discountedPrice !== undefined) {
      updatedData.discountedPrice = Number(updatedData.discountedPrice) || 0;
    }
    
    // Process image upload if present
    if (req.files && req.files.image) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
          folder: 'deals',
        });
        updatedData.imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
      }
    }

    // Process image gallery - only if new files are uploaded
    if (req.files) {
      const galleryFiles = Object.keys(req.files)
        .filter(key => key.startsWith('galleryImage_'))
        .sort((a, b) => {
          const idxA = parseInt(a.split('_')[1]);
          const idxB = parseInt(b.split('_')[1]);
          return idxA - idxB;
        })
        .map(key => req.files[key]);

      if (galleryFiles.length > 0) {
        const imageGallery = updatedData.imageGallery && Array.isArray(updatedData.imageGallery) 
          ? [...updatedData.imageGallery] 
          : [];
        
        for (let i = 0; i < galleryFiles.length; i++) {
          const file = galleryFiles[i];
          try {
            const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'deals/gallery',
            });
            imageGallery.push({
              url: uploadResult.secure_url,
              alt: updatedData.title || updatedData.name || `Deal image ${imageGallery.length + 1}`,
              order: imageGallery.length,
            });
          } catch (galleryError) {
            console.error(`Error uploading gallery image ${i}:`, galleryError);
          }
        }
        if (imageGallery.length > 0) {
          updatedData.imageGallery = imageGallery;
        }
      }
      // If no new gallery files but imageGallery was parsed from form, keep it
      // (it's already set in updatedData from the parsing above)
    }
    
    // Get the deal before update to check if isActive is changing
    const oldDeal = await Deal.findById(id);
    if (!oldDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const wasInactive = !oldDeal.isActive;
    const willBeActive = updatedData.isActive === true;

    // Log what we're about to update
    console.log('📝 Updating deal with data:', JSON.stringify({
      isPublished: updatedData.isPublished,
      isActive: updatedData.isActive,
      title: updatedData.title || updatedData.name,
      // Only log a few key fields to avoid cluttering
    }, null, 2));

    const updatedDeal = await Deal.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
    if (!updatedDeal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    console.log('✅ Deal updated successfully. New isPublished:', updatedDeal.isPublished, 'New isActive:', updatedDeal.isActive);

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
    console.error('Error updating deal:', error);
    console.error('Error stack:', error.stack);
    console.error('Updated data:', JSON.stringify(updatedData, null, 2));
    res.status(500).json({ 
      message: 'Error updating deal', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete a deal by ID
exports.deleteDeal = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if deal exists before cleanup
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Clean up all related data (non-blocking, but wait for completion)
    try {
      await Promise.all([
        View.deleteMany({ dealId: id }),
        Interaction.deleteMany({ dealId: id }),
        RateAndReview.deleteMany({ dealId: id }),
        Vote.deleteMany({ dealId: id, entityType: 'deal' }),
        CouponUsage.deleteMany({ entityId: id, entityType: 'deal' })
      ]);
    } catch (cleanupError) {
      console.error('Error cleaning up deal-related data:', cleanupError);
      // Continue with deletion even if cleanup fails
    }
    
    // Delete the deal (translations are automatically deleted as they're embedded)
    await Deal.findByIdAndDelete(id);
    
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
