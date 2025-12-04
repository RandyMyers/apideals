const Coupon = require('../models/coupon'); // Adjust the path as per your project structure
const Subscription = require('../models/subscriptions'); // Import Subscription model
const User = require('../models/user');
const Store = require('../models/store');
const cloudinary = require('cloudinary').v2;
const { isCountryAvailable } = require('../utils/countryUtils');
const notificationService = require('../services/notificationService');

exports.createCoupon = async (req, res) => {
  try {
    const { 
      userId, 
      storeId, 
      categoryId, 
      subscriptionId, 
      imageUrl, 
      productId, 
      ...otherCouponData 
    } = req.body;

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

    
    // Process main image
    if (!imageUrl) {
      if (req.files && req.files.image) {
        const image = req.files.image;
        const uploadResult = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'coupons', // Optional folder in Cloudinary
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
              folder: 'coupons/gallery',
            });
            imageGallery.push({
              url: uploadResult.secure_url,
              alt: otherCouponData.title || otherCouponData.code || `Coupon image ${i + 1}`,
              order: i,
            });
          } catch (galleryError) {
            console.error(`Error uploading gallery image ${i}:`, galleryError);
            // Continue with other images even if one fails
          }
        }
      }
    }

    // Process array fields (highlights, tags, seoKeywords)
    let highlights = [];
    if (otherCouponData.highlights) {
      try {
        highlights = typeof otherCouponData.highlights === 'string' 
          ? JSON.parse(otherCouponData.highlights)
          : (Array.isArray(otherCouponData.highlights) ? otherCouponData.highlights : []);
      } catch (e) {
        console.warn('Could not parse highlights, using empty array');
      }
    }

    let tags = [];
    if (otherCouponData.tags) {
      try {
        tags = typeof otherCouponData.tags === 'string' 
          ? JSON.parse(otherCouponData.tags)
          : (Array.isArray(otherCouponData.tags) ? otherCouponData.tags : []);
      } catch (e) {
        console.warn('Could not parse tags, using empty array');
      }
    }

    let seoKeywords = [];
    if (otherCouponData.seoKeywords) {
      try {
        seoKeywords = typeof otherCouponData.seoKeywords === 'string' 
          ? JSON.parse(otherCouponData.seoKeywords)
          : (Array.isArray(otherCouponData.seoKeywords) ? otherCouponData.seoKeywords : []);
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
        tags: tagsRaw,
        seoKeywords: seoKeywordsRaw,
        ...couponData 
      } = otherCouponData;
      
      // Default isPublished based on user type - admins can publish immediately
      const defaultIsPublished = (userType === 'superAdmin' || userType === 'couponManager') 
        ? (couponData.isPublished !== undefined ? couponData.isPublished : true)
        : false;
      
      const newCoupon = new Coupon({ 
        storeId, 
        categoryId, 
        subscriptionId, 
        imageUrl, 
        productId,
        imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
        highlights: highlights.length > 0 ? highlights : undefined,
        tags: tags.length > 0 ? tags : undefined,
        seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
        availableCountries: availableCountries || ['WORLDWIDE'],
        isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
        isPublished: defaultIsPublished,
        ...couponData 
      });
    await newCoupon.save();

    console.log(newCoupon);

    // Notify store followers about new coupon (non-blocking)
    try {
      const store = await Store.findById(storeId).select('name followers').lean();
      
      if (store && store.followers && store.followers.length > 0 && newCoupon.isActive) {
        const discountText = newCoupon.discountType === 'percentage' 
          ? `${newCoupon.discountValue}% off`
          : `$${newCoupon.discountValue} off`;
        
        await notificationService.sendBulkNotifications(
          store.followers.map(f => f.toString()),
          'new_coupon_available',
          {
            storeName: store.name,
            couponCode: newCoupon.code,
            discount: discountText
          },
          { actionUrl: `/coupons/${newCoupon._id}` }
        );
      }
    } catch (notifError) {
      console.error('Error sending follower notification for new coupon:', notifError);
      // Don't fail creation if notification fails
    }

    return res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
    }

    // Validate subscription for regular users
    if (!subscriptionId) {
      return res.status(400).json({ message: 'SubscriptionId is required for regular users.' });
    }

    const userSubscription = await Subscription.findById(subscriptionId);
    if (!userSubscription) {
      return res.status(404).json({ message: 'Subscription not found.' });
    }

    // Enforce coupon creation limits
    if (userSubscription.couponCount >= userSubscription.couponLimit) {
      return res.status(403).json({
        message: `Coupon creation limit reached. You can create up to ${userSubscription.couponLimit} coupons.`,
      });
    }

    // Create a new coupon
    const { 
      availableCountries, 
      isWorldwide, 
      highlights: highlightsRaw,
      tags: tagsRaw,
      seoKeywords: seoKeywordsRaw,
      ...couponData 
    } = otherCouponData;
    
    // Default isPublished - regular users default to false
    const defaultIsPublished = couponData.isPublished !== undefined ? couponData.isPublished : false;
    
    const newCoupon = new Coupon({ 
      storeId, 
      categoryId, 
      subscriptionId, 
      imageUrl, 
      productId,
      imageGallery: imageGallery.length > 0 ? imageGallery : undefined,
      highlights: highlights.length > 0 ? highlights : undefined,
      tags: tags.length > 0 ? tags : undefined,
      seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
      availableCountries: availableCountries || ['WORLDWIDE'],
      isWorldwide: isWorldwide !== undefined ? isWorldwide : (availableCountries ? false : true),
      isPublished: defaultIsPublished,
      ...couponData 
    });
    await newCoupon.save();

    // Increment coupon count in the subscription
    userSubscription.couponCount = (userSubscription.couponCount || 0) + 1;
    await userSubscription.save();

    // Notify store followers about new coupon (non-blocking)
    try {
      const store = await Store.findById(storeId).select('name followers').lean();
      
      if (store && store.followers && store.followers.length > 0 && newCoupon.isActive) {
        const discountText = newCoupon.discountType === 'percentage' 
          ? `${newCoupon.discountValue}% off`
          : `$${newCoupon.discountValue} off`;
        
        await notificationService.sendBulkNotifications(
          store.followers.map(f => f.toString()),
          'new_coupon_available',
          {
            storeName: store.name,
            couponCode: newCoupon.code,
            discount: discountText
          },
          { actionUrl: `/coupons/${newCoupon._id}` }
        );
      }
    } catch (notifError) {
      console.error('Error sending follower notification for new coupon:', notifError);
      // Don't fail creation if notification fails
    }

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Error creating coupon', error: error.message });
  }
};

// Bulk upsert coupons
exports.bulkUpsert = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.items) ? req.body.items : []);
    if (!items.length) return res.status(400).json({ message: 'No items provided' });
    let created = 0, updated = 0, errors = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.userId || !it.storeId || !it.categoryId || !it.code) { 
        errors.push({ i, message:'Missing required fields' }); 
        continue; 
      }
      try {
        const doc = await Coupon.findOneAndUpdate(
          { code: it.code, storeId: it.storeId },
          { ...it, updatedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (doc.createdAt && (Date.now()-doc.createdAt.getTime()) < 2000) created++; else updated++;
      } catch(e){ 
        errors.push({ i, message: e.message }); 
      }
    }
    res.json({ created, updated, errors });
  } catch (error) {
    res.status(500).json({ message: 'Bulk upsert failed', error: error.message });
  }
};

// Get all coupons (public - only active coupons, or all for admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const { country, admin } = req.query; // Visitor country for location filtering, admin flag to show all
    const now = new Date();
    
    // Build query - if admin=true, show all coupons (including expired/inactive/unpublished)
    let query = {};
    if (admin !== 'true') {
      // Public query: only published, active and non-expired
      // Explicitly require isPublished: true (undefined values won't match, which is correct)
      query = {
        isPublished: true,
        isActive: true,
        $or: [
          { endDate: { $gte: now } },
          { endDate: null },
          { endDate: { $exists: false } }
        ]
      };
    }
    // If admin=true, query is empty (show all)
    
    console.log('🔍 getAllCoupons - Query:', JSON.stringify(query, null, 2));
    console.log('🔍 getAllCoupons - Admin flag:', admin);
    
    let coupons = await Coupon.find(query)
      .populate({
        path: 'storeId',
        select: 'name website logo',
        strictPopulate: false // Don't throw error if storeId is invalid
      })
      .populate({
        path: 'categoryId',
        select: 'name',
        strictPopulate: false // Don't throw error if categoryId is invalid
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${coupons.length} coupons matching query`);
    if (coupons.length > 0) {
      console.log('📋 Sample coupon isPublished values:', coupons.slice(0, 5).map(c => ({ 
        id: c._id, 
        title: c.title || c.code, 
        isPublished: c.isPublished, 
        isActive: c.isActive 
      })));
    }

    // Filter by location if country is provided
    if (country) {
      coupons = coupons.filter(coupon => 
        isCountryAvailable(country, coupon.availableCountries || [], coupon.isWorldwide !== false)
      );
    }

    // Map coupons to ensure consistent structure (handle null populated fields)
    coupons = coupons.map(coupon => {
      // Log each coupon's isPublished status for debugging
      if (admin !== 'true' && coupon.isPublished !== true) {
        console.warn(`⚠️ Coupon ${coupon._id} (${coupon.title || coupon.code}) has isPublished: ${coupon.isPublished}, but should be true for public view`);
      }
      
      // Ensure imageGallery is properly formatted
      let imageGallery = coupon.imageGallery || [];
      if (!Array.isArray(imageGallery)) {
        imageGallery = [];
      }
      
      // If imageGallery is empty but imageUrl exists, create gallery from single image
      if (imageGallery.length === 0 && coupon.imageUrl) {
        imageGallery = [{
          url: coupon.imageUrl,
          alt: coupon.title || coupon.code || 'Coupon image',
          order: 0,
        }];
      }
      
      // Calculate status based on endDate
      let status = 'active';
      if (coupon.endDate) {
        const endDate = new Date(coupon.endDate);
        if (endDate < now) {
          status = 'expired';
        } else {
          status = 'active';
        }
      }
      
      return {
        ...coupon,
        store: coupon.storeId || null, // Map storeId to store for frontend compatibility
        category: coupon.categoryId || null,
        imageGallery: imageGallery, // Ensure imageGallery is always an array
        imageUrl: coupon.imageUrl || (imageGallery.length > 0 ? imageGallery[0].url : null), // Ensure imageUrl exists
        status: status // Add status field (active/expired)
      };
    });

    res.status(200).json(coupons);
  } catch (error) {
    console.error('Error in getAllCoupons:', error);
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

// Get a single coupon by ID
exports.getCouponById = async (req, res) => {
  const { id } = req.params;
  const { country } = req.query; // Visitor country for location filtering
  
  // Validate MongoDB ObjectId format
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({ message: 'Invalid coupon ID format' });
  }

  try {
    const coupon = await Coupon.findById(id)
      .populate({
        path: 'affiliateId',
        select: 'name',
        strictPopulate: false
      })
      .populate({
        path: 'storeId',
        select: 'name website logo rating followers',
        strictPopulate: false
      })
      .populate({
        path: 'categoryId',
        select: 'name slug',
        strictPopulate: false
      })
      .populate({
        path: 'userId',
        select: 'username',
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
      .lean();

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Map storeId to store for frontend compatibility
    if (coupon.storeId) {
      coupon.store = coupon.storeId;
    }

    // Check if coupon is available in visitor's country
    if (country && !isCountryAvailable(country, coupon.availableCountries || [], coupon.isWorldwide !== false)) {
      return res.status(403).json({ 
        message: 'This coupon is not available in your location',
        availableCountries: coupon.availableCountries
      });
    }

    // If imageGallery is empty but imageUrl exists, create gallery from single image
    if ((!coupon.imageGallery || coupon.imageGallery.length === 0) && coupon.imageUrl) {
      coupon.imageGallery = [{
        url: coupon.imageUrl,
        alt: coupon.title || coupon.code || 'Coupon image',
        order: 0,
      }];
    }

    // Format variations for JSON response (convert Map to plain object)
    if (coupon.isVariableProduct && coupon.variations && Array.isArray(coupon.variations)) {
      coupon.variations = coupon.variations.map(v => {
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

    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error fetching coupon by ID:', error);
    res.status(500).json({ 
      message: 'Error fetching coupon', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getCouponsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const coupons = await Coupon.find({ userId })
      .populate('affiliateId', 'name')
      .populate('storeId', 'name location')
      .populate('categoryId', 'name');

    if (!coupons || coupons.length === 0) {
      return res.status(404).json({ message: 'No coupons found for this user.' });
    }

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

// Get all coupons for admin (includes expired and inactive)
exports.getAllCouponsAdmin = async (req, res) => {
  try {
    const { storeId, categoryId, isActive, search } = req.query;
    const query = {};
    
    // Filter by store if provided
    if (storeId) {
      query.storeId = storeId;
    }
    
    // Filter by category if provided
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Search by code or title if provided
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    let coupons = await Coupon.find(query)
      .populate({
        path: 'storeId',
        select: 'name website logo',
        strictPopulate: false
      })
      .populate({
        path: 'categoryId',
        select: 'name',
        strictPopulate: false
      })
      .sort({ createdAt: -1 })
      .lean();

    // Map coupons to ensure consistent structure
    coupons = coupons.map(coupon => {
      let imageGallery = coupon.imageGallery || [];
      if (!Array.isArray(imageGallery)) {
        imageGallery = [];
      }
      
      if (imageGallery.length === 0 && coupon.imageUrl) {
        imageGallery = [{
          url: coupon.imageUrl,
          alt: coupon.title || coupon.code || 'Coupon image',
          order: 0,
        }];
      }
      
      return {
        ...coupon,
        store: coupon.storeId || null,
        category: coupon.categoryId || null,
        imageGallery: imageGallery,
        imageUrl: coupon.imageUrl || (imageGallery.length > 0 ? imageGallery[0].url : null)
      };
    });

    res.status(200).json(coupons);
  } catch (error) {
    console.error('Error in getAllCouponsAdmin:', error);
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};


// Update a coupon by ID
exports.updateCoupon = async (req, res) => {
  const { id } = req.params;
  let updatedData = {};

  try {
    // Handle FormData (multipart/form-data) or JSON
    if (req.body && typeof req.body === 'object') {
      // Parse FormData fields
      Object.keys(req.body).forEach(key => {
        const value = req.body[key];
        
        // Handle JSON strings
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            updatedData[key] = JSON.parse(value);
          } catch (e) {
            updatedData[key] = value;
          }
        } else {
          updatedData[key] = value;
        }
      });
    }

    // Handle language-specific fields
    if (updatedData.languageData) {
      try {
        const languageData = typeof updatedData.languageData === 'string' 
          ? JSON.parse(updatedData.languageData) 
          : updatedData.languageData;
        
        // Store language data in a nested structure
        // For now, we'll use the current language (default to 'en') for main fields
        // and store all language data in a separate field
        if (languageData.en) {
          updatedData.title = languageData.en.title || updatedData.title;
          updatedData.description = languageData.en.description || updatedData.description;
          updatedData.instructions = languageData.en.instructions || updatedData.instructions;
          updatedData.longDescription = languageData.en.longDescription || updatedData.longDescription;
          updatedData.termsAndConditions = languageData.en.termsAndConditions || updatedData.termsAndConditions;
          updatedData.seoTitle = languageData.en.seoTitle || updatedData.seoTitle;
          updatedData.seoDescription = languageData.en.seoDescription || updatedData.seoDescription;
          
          if (languageData.en.highlights) {
            updatedData.highlights = typeof languageData.en.highlights === 'string'
              ? languageData.en.highlights.split('\n').filter(item => item.trim())
              : languageData.en.highlights;
          }
        }
        
        // Store all language data for future use
        updatedData.languageTranslations = languageData;
      } catch (e) {
        console.error('Error parsing language data:', e);
      }
      delete updatedData.languageData; // Remove from update object
    }

    // Process main image upload
    if (req.files && req.files.image) {
      const image = req.files.image;
      try {
        const uploadResult = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'coupons',
        });
        updatedData.imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
      }
    }

    // Process image gallery
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
        const imageGallery = [];
        for (let i = 0; i < galleryFiles.length; i++) {
          const file = galleryFiles[i];
          try {
            const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'coupons/gallery',
            });
            imageGallery.push({
              url: uploadResult.secure_url,
              alt: updatedData.title || updatedData.code || `Coupon image ${i + 1}`,
              order: i,
            });
          } catch (galleryError) {
            console.error(`Error uploading gallery image ${i}:`, galleryError);
          }
        }
        if (imageGallery.length > 0) {
          updatedData.imageGallery = imageGallery;
        }
      }
    }

    // Process array fields
    if (updatedData.highlights && typeof updatedData.highlights === 'string') {
      try {
        updatedData.highlights = JSON.parse(updatedData.highlights);
      } catch (e) {
        updatedData.highlights = updatedData.highlights.split('\n').filter(item => item.trim());
      }
    }

    if (updatedData.tags && typeof updatedData.tags === 'string') {
      try {
        updatedData.tags = JSON.parse(updatedData.tags);
      } catch (e) {
        updatedData.tags = updatedData.tags.split(',').map(item => item.trim()).filter(item => item);
      }
    }

    if (updatedData.seoKeywords && typeof updatedData.seoKeywords === 'string') {
      try {
        updatedData.seoKeywords = JSON.parse(updatedData.seoKeywords);
      } catch (e) {
        updatedData.seoKeywords = updatedData.seoKeywords.split(',').map(item => item.trim()).filter(item => item);
      }
    }

    // Convert date strings to Date objects
    if (updatedData.startDate && typeof updatedData.startDate === 'string') {
      updatedData.startDate = new Date(updatedData.startDate);
    }
    if (updatedData.endDate && typeof updatedData.endDate === 'string') {
      updatedData.endDate = new Date(updatedData.endDate);
    }

    // Convert boolean strings
    if (updatedData.isActive !== undefined) {
      updatedData.isActive = updatedData.isActive === 'true' || updatedData.isActive === true;
    }
    if (updatedData.isPublished !== undefined) {
      updatedData.isPublished = updatedData.isPublished === 'true' || updatedData.isPublished === true;
    }

    // Convert numeric fields
    if (updatedData.discountValue !== undefined) {
      updatedData.discountValue = Number(updatedData.discountValue);
    }
    if (updatedData.minPurchaseAmount !== undefined) {
      updatedData.minPurchaseAmount = Number(updatedData.minPurchaseAmount) || 0;
    }
    if (updatedData.usageLimit !== undefined) {
      updatedData.usageLimit = Number(updatedData.usageLimit) || 1;
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true })
      .populate('affiliateId', 'name')
      .populate('storeId', 'name location')
      .populate('categoryId', 'name');

    if (!updatedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Error updating coupon', error: error.message });
  }
};

// Delete a coupon by ID
exports.deleteCoupon = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting coupon', error: error.message });
  }
};

// Check if a coupon is valid
exports.checkCouponValidity = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const isValid = coupon.isValid();
    res.status(200).json({ message: isValid ? 'Coupon is valid' : 'Coupon is invalid', isValid });
  } catch (error) {
    res.status(500).json({ message: 'Error checking coupon validity', error: error.message });
  }
};

// Increment usage count of a coupon
exports.incrementCouponUsage = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({ message: 'Coupon is invalid or expired' });
    }

    await coupon.incrementUsage();

    // Refresh coupon to get updated usage count
    const updatedCoupon = await Coupon.findById(id);

    // Notify users who have followed this coupon (non-blocking)
    try {
      const usersWithFollowedCoupon = await User.find({
        'FollowedCoupons.couponId': coupon._id
      }).select('_id').lean();

      if (usersWithFollowedCoupon.length > 0) {
        const store = await Store.findById(coupon.storeId).select('name').lean();
        
        for (const user of usersWithFollowedCoupon) {
          try {
            await notificationService.createNotification(
              user._id,
              'saved_coupon_used',
              {
                couponCode: coupon.code || 'Your coupon',
                storeName: store?.name || 'Store'
              },
              { actionUrl: `/coupons/${coupon._id}` }
            );
          } catch (notifError) {
            console.error(`Error sending saved coupon used notification to user ${user._id}:`, notifError);
          }
        }
      }
    } catch (notifError) {
      console.error('Error processing saved coupon used notifications:', notifError);
      // Don't fail the increment if notification fails
    }

    // Notify admins if coupon usage is high (non-blocking)
    try {
      const usageCount = updatedCoupon.usedCount || 0;
      
      // Notify admins every 50 uses after reaching 100 uses
      if (usageCount >= 100 && usageCount % 50 === 0) {
        const adminUsers = await User.find({ 
          userType: { $in: ['superAdmin', 'couponManager'] } 
        }).select('_id').lean();
        
        if (adminUsers.length > 0) {
          const adminIds = adminUsers.map(admin => admin._id.toString());
          const store = await Store.findById(coupon.storeId).select('name').lean();
          
          await notificationService.sendBulkNotifications(
            adminIds,
            'high_usage_coupon',
            {
              couponCode: coupon.code || 'Coupon',
              usageCount: usageCount,
              storeName: store?.name || 'Store'
            }
          );
        }
      }
    } catch (adminNotifError) {
      console.error('Error sending high usage coupon alert to admins:', adminNotifError);
      // Don't fail the increment if notification fails
    }

    res.status(200).json({ message: 'Coupon usage incremented successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error incrementing coupon usage', error: error.message });
  }
};

// Get trending coupons
exports.getTrendingCoupons = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const searchLimit = parseInt(limit);

    // Get trending coupons based on views, usage count, and recent activity
    const trendingCoupons = await Coupon.find({ isActive: true })
      .sort({ 
        views: -1, 
        usageCount: -1, 
        createdAt: -1 
      })
      .limit(searchLimit)
      .populate('storeId', 'name logo')
      .populate('categoryId', 'name')
      .lean();

    // Format coupons for frontend
    const formattedCoupons = trendingCoupons.map(coupon => {
      const discountText = coupon.discountType === 'percentage'
        ? `${coupon.discountValue}%`
        : `$${coupon.discountValue}`;

      return {
        id: coupon._id.toString(),
        _id: coupon._id.toString(),
        logo: coupon.storeId?.logo || coupon.imageUrl || 'https://via.placeholder.com/60',
        discount: discountText,
        title: coupon.title || `${discountText} Off`,
        description: coupon.description || '',
        code: coupon.code || '',
        usage: coupon.usageLimitPerUser === 1 ? 'One-time use only' : 'Unlimited use',
        expirationDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : null,
        instructions: coupon.instructions || '',
        store: coupon.storeId,
        category: coupon.categoryId,
      };
    });

    res.json({
      success: true,
      coupons: formattedCoupons,
      count: formattedCoupons.length,
    });
  } catch (error) {
    console.error('Error fetching trending coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending coupons',
      error: error.message,
    });
  }
};
