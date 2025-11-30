const Store = require('../models/store');
const Subscription = require('../models/subscriptions');
const User = require('../models/user');
const RateAndReview = require('../models/rateAndReview');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const {syncProducts} = require('./productController');
const { isCountryAvailable } = require('../utils/countryUtils');
const notificationService = require('../services/notificationService');

// Create a new store
exports.createStore = async (req, res) => {
    try {
        const {
            name,
            userId, // User creating the store
            description,
            affiliateId,
            subscription, // Subscription ID (for regular users)
            url,
            apiKey,
            secretKey,
            categoryId, // Category ID for the store
            storeType, // Store type: 'woocommerce', 'shopify', 'none'
            availableCountries: availableCountriesRaw,
            isWorldwide: isWorldwideRaw,
            storeIndicators: storeIndicatorsRaw,
        } = req.body;

        console.log(req.body);

        let logoUrl = '';
        let cloudinaryId = '';

         // Handle logo upload
         if (req.files && req.files.logo) {
            const file = req.files.logo;
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: 'store_logos', // Folder in Cloudinary
                public_id: `store_${Date.now()}`, // Unique ID for the logo
                overwrite: false,
            });

            logoUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        // Fetch user details
        const user = await User.findById(userId);
        console.log(user);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Normalize location targeting from request body
        let availableCountries = Array.isArray(availableCountriesRaw)
          ? availableCountriesRaw
          : (typeof availableCountriesRaw === 'string' && availableCountriesRaw
              ? [availableCountriesRaw]
              : undefined);
        if (!availableCountries || availableCountries.length === 0) {
          availableCountries = ['WORLDWIDE'];
        }
        const isWorldwide = isWorldwideRaw !== undefined
          ? (isWorldwideRaw === true || isWorldwideRaw === 'true')
          : (availableCountries.includes('WORLDWIDE') || availableCountries.length === 0);

        // Parse storeIndicators (optional JSON string or array)
        let storeIndicators = [];
        if (Array.isArray(storeIndicatorsRaw)) {
          storeIndicators = storeIndicatorsRaw;
        } else if (typeof storeIndicatorsRaw === 'string') {
          try {
            const parsed = JSON.parse(storeIndicatorsRaw);
            if (Array.isArray(parsed)) {
              storeIndicators = parsed.filter(ind => ind && ind.key && ind.label);
            }
          } catch (e) {
            console.warn('Could not parse storeIndicators JSON:', e.message);
          }
        }

        // Admin scenario: Skip subscription checks for admin users
        if (user.userType === 'superAdmin' || user.userType === 'couponManager') {
            // Create store without subscription limit enforcement
            const adminStore = new Store({
                name,
                userId,
                affiliate: affiliateId,
                description,
                logo: logoUrl,
                url,
                apiKey,
                secretKey,
                categoryId,
                storeType: storeType || 'none',
                subscription: null, // No subscription linked for admin-created stores
                availableCountries,
                isWorldwide,
                storeIndicators,
            });

            await adminStore.save();

            const objectId = new mongoose.Types.ObjectId(adminStore._id);
             const storeId = objectId.toString();
             

             if (apiKey && secretKey) {
                await syncProducts(storeId, userId);
            }

            // Send notification to admins about new store (non-blocking)
            try {
              const adminUsers = await User.find({ 
                userType: { $in: ['superAdmin', 'couponManager'] } 
              }).select('_id');
              
              if (adminUsers.length > 0) {
                const adminIds = adminUsers.map(admin => admin._id.toString());
                await notificationService.sendBulkNotifications(
                  adminIds,
                  'store_created',
                  { 
                    storeName: adminStore.name,
                    userName: user?.username || 'Admin'
                  }
                );
              }
            } catch (notifError) {
              console.error('Error sending admin notification for store creation:', notifError);
            }

            return res.status(201).json({ message: 'Store created successfully by admin', store: adminStore });
        }

        // Regular user scenario: Enforce subscription limits
        const userSubscription = await Subscription.findById(subscription);
        if (!userSubscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        if (userSubscription.storeCount >= userSubscription.storeLimit) {
            return res.status(403).json({
                message: `Store creation limit reached. You can create up to ${userSubscription.storeLimit} stores.`,
            });
        }

        // Create the store
        const store = new Store({
            name,
            userId,
            description,
            logo: logoUrl,
            subscription,
            url,
            apiKey,
            secretKey,
            categoryId,
            storeType: storeType || 'none',
            availableCountries,
            isWorldwide,
            storeIndicators,
        });

        await store.save();
        
        const objectId = new mongoose.Types.ObjectId(store._id);
        const storeId = objectId.toString();

        if (apiKey && secretKey) {
            await syncProducts(storeId, userId);
        }

        // Send notification to admins about new store (non-blocking)
        try {
          const adminUsers = await User.find({ 
            userType: { $in: ['superAdmin', 'couponManager'] } 
          }).select('_id');
          
          if (adminUsers.length > 0) {
            const adminIds = adminUsers.map(admin => admin._id.toString());
            await notificationService.sendBulkNotifications(
              adminIds,
              'store_created',
              { 
                storeName: store.name,
                userName: user?.username || 'User'
              }
            );
          }
        } catch (notifError) {
          console.error('Error sending admin notification for store creation:', notifError);
        }

        // Increment store count for the user's subscription
        userSubscription.storeCount = (userSubscription.storeCount || 0) + 1;
        await userSubscription.save();

        res.status(201).json({
            message: 'Store created successfully',
            store,
        });
    } catch (error) {
        console.error('Error creating store:', error);

        // Handle duplicate key errors (MongoDB unique index violations on store name)
        if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
            return res.status(409).json({
                message: 'A store with this name already exists. Please choose a different store name.',
                field: 'name',
            });
        }

        res.status(500).json({
            message: 'Error creating store',
            error: error.message || error,
        });
    }
};

// Get all stores
exports.getAllStores = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            sort = 'newest', // newest, views, rating, name
            category, 
            search,
            isActive = true,
            country, // Visitor country for location filtering
            exclude // Comma-separated store IDs to exclude
        } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const query = {};
        
        // Filter by active status (default to showing all stores if not specified)
        // Only filter by isActive if explicitly set to true
        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }
        // If isActive is not specified, don't filter by it (show all stores)
        
        // Filter by category
        if (category) {
            query.categoryId = category;
        }
        
        // Exclude specific stores (for related stores)
        if (exclude) {
            const excludeIds = exclude.split(',').map(id => id.trim()).filter(Boolean);
            if (excludeIds.length > 0) {
                query._id = { $nin: excludeIds };
            }
        }
        
        // Search by name or description
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Sorting
        let sortOption = {};
        switch(sort) {
            case 'views':
                sortOption = { viewCount: -1 };
                break;
            case 'rating':
                sortOption = { averageRating: -1 };
                break;
            case 'name':
                sortOption = { name: 1 };
                break;
            case 'newest':
            default:
                sortOption = { createdAt: -1 };
                break;
        }
        
        // For admin requests, if limit is very large (>= 1000), return all stores without pagination
        const isAdminRequest = parseInt(limit) >= 1000;
        let stores;
        if (isAdminRequest) {
            stores = await Store.find(query)
                .populate('userId', 'name email')
                .populate('categoryId', 'name')
                .sort(sortOption)
                .lean();
        } else {
            stores = await Store.find(query)
                .populate('userId', 'name email')
                .populate('categoryId', 'name')
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
        }
        
        // Filter by location if country is provided
        if (country) {
            stores = stores.filter(store => 
                isCountryAvailable(country, store.availableCountries || [], store.isWorldwide !== false)
            );
        }
        
        const totalQuery = { ...query };
        let total = await Store.countDocuments(totalQuery);
        
        // If country filtering is applied, we need to count filtered results
        if (country) {
            const allStores = await Store.find(totalQuery).lean();
            const filteredStores = allStores.filter(store => 
                isCountryAvailable(country, store.availableCountries || [], store.isWorldwide !== false)
            );
            total = filteredStores.length;
        }
        
        res.status(200).json({
            stores,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({
            message: 'Error fetching stores',
            error,
        });
    }
};

// Get top stores based on views
exports.getTopStores = async (req, res) => {
    try {
        const { limit = 10, period = 'alltime', country } = req.query;
        const View = require('../models/view');
        
        let dateFilter = {};
        if (period === '30days') {
            dateFilter = { viewedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        } else if (period === '7days') {
            dateFilter = { viewedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        }
        
        // Aggregate views by store
        const viewAggregation = await View.aggregate([
            { $match: { ...dateFilter, storeId: { $exists: true, $ne: null } } },
            { $group: { _id: '$storeId', viewCount: { $sum: 1 } } },
            { $sort: { viewCount: -1 } },
            { $limit: parseInt(limit) * 2 } // Get more to filter by location
        ]);
        
        const storeIds = viewAggregation.map(v => v._id);
        
        // Get stores with view counts
        let stores = await Store.find({ _id: { $in: storeIds }, isActive: true })
            .populate('userId', 'name email')
            .populate('categoryId', 'name')
            .lean();
        
        // Filter by location if country is provided
        if (country) {
            stores = stores.filter(store => 
                isCountryAvailable(country, store.availableCountries || [], store.isWorldwide !== false)
            );
        }
            
        // Merge view counts
        const storesWithViews = stores.map(store => {
            const viewData = viewAggregation.find(v => v._id.toString() === store._id.toString());
            return {
                ...store,
                viewCount: viewData ? viewData.viewCount : store.viewCount || 0
            };
        });
        
        // Sort by view count (from aggregation, not denormalized)
        storesWithViews.sort((a, b) => b.viewCount - a.viewCount);
        
        // Limit to requested amount
        const limitedStores = storesWithViews.slice(0, parseInt(limit));
        
        res.status(200).json(limitedStores);
    } catch (error) {
        console.error('Error fetching top stores:', error);
        res.status(500).json({
            message: 'Error fetching top stores',
            error,
        });
    }
};

// Get sponsored stores
exports.getSponsoredStores = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const stores = await Store.find({
            isSponsored: true,
            isActive: true,
            // Optional: Only show active sponsored campaigns
            $or: [
                { sponsoredEndDate: { $exists: false } },
                { sponsoredEndDate: null },
                { sponsoredEndDate: { $gte: new Date() } }
            ]
        })
            .populate('userId', 'name email')
            .populate('categoryId', 'name')
            .sort({ sponsoredPriority: -1, createdAt: -1 }) // Sort by priority first, then date
            .limit(parseInt(limit));
            
        res.status(200).json(stores);
    } catch (error) {
        console.error('Error fetching sponsored stores:', error);
        res.status(500).json({
            message: 'Error fetching sponsored stores',
            error,
        });
    }
};

// Get trending stores by category
exports.getTrendingStoresByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { limit = 6 } = req.query;
        
        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }

        // Get stores in this category, sorted by views/rating/followers
        const stores = await Store.find({
            categoryId: categoryId,
            isActive: true
        })
            .populate('categoryId', 'name slug')
            .sort({ views: -1, rating: -1, followers: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .select('name logo website rating followers categoryId views')
            .lean();

        res.status(200).json(stores);
    } catch (error) {
        console.error('Error fetching trending stores by category:', error);
        res.status(500).json({
            message: 'Error fetching trending stores',
            error: error.message
        });
    }
};

// Update sponsored status (Admin or Store Owner)
exports.updateSponsoredStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isSponsored, sponsoredPriority, sponsoredEndDate } = req.body;
        const userId = req.user?.userId || req.user?.id;
        const userType = req.user?.userType;
        
        const store = await Store.findById(id);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        
        // Check permissions: Admin can update any store, users can only update their own
        if (userType !== 'superAdmin' && userType !== 'couponManager') {
            if (store.userId.toString() !== userId.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this store' });
            }
        }
        
        const updateData = {};
        if (isSponsored !== undefined) updateData.isSponsored = isSponsored;
        if (sponsoredPriority !== undefined) updateData.sponsoredPriority = sponsoredPriority;
        if (sponsoredEndDate !== undefined) updateData.sponsoredEndDate = sponsoredEndDate;
        
        // Set sponsored start date if being set to sponsored
        if (isSponsored === true && !store.isSponsored) {
            updateData.sponsoredStartDate = new Date();
            updateData.sponsoredByUserId = userId;
        }
        
        const updatedStore = await Store.findByIdAndUpdate(id, updateData, { new: true })
            .populate('userId', 'name email')
            .populate('categoryId', 'name');
            
        res.status(200).json({
            message: 'Store sponsored status updated successfully',
            store: updatedStore
        });
    } catch (error) {
        console.error('Error updating sponsored status:', error);
        res.status(500).json({
            message: 'Error updating sponsored status',
            error,
        });
    }
};

// Get a single store by ID
exports.getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const { country } = req.query; // Visitor country for location filtering

        const store = await Store.findById(id)
            .populate('userId', 'name email')
            .populate('coupons')
            .populate('deals')
            .populate('subscription')
            .populate('categoryId', 'name')
            .populate('affiliates', 'name')
            .lean();

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check if store is available in visitor's country
        if (country && !isCountryAvailable(country, store.availableCountries || [], store.isWorldwide !== false)) {
            return res.status(403).json({ 
                message: 'This store is not available in your location',
                availableCountries: store.availableCountries
            });
        }

        res.status(200).json(store);
    } catch (error) {
        console.error('Error fetching store:', error);
        res.status(500).json({
            message: 'Error fetching store',
            error,
        });
    }
};

// Get stores by user ID
exports.getStoresByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(req.params);

        // Fetch stores created by the specified user
        const stores = await Store.find({ userId })
            .populate('userId', 'name email') // Populate user details
            .populate('coupons') // Populate coupon details
            .populate('deals') // Populate deal details
            .populate('subscription'); // Populate subscription details

        if (!stores || stores.length === 0) {
            return res.status(404).json({ message: 'No stores found for the given user' });
        }

        res.status(200).json(stores);
    } catch (error) {
        console.error('Error fetching stores by user ID:', error);
        res.status(500).json({
            message: 'Error fetching stores by user ID',
            error,
        });
    }
};

// Follow a store
exports.followStore = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const store = await Store.findById(id);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check if user already follows
        if (store.followers && store.followers.includes(userId)) {
            return res.status(400).json({ message: 'You already follow this store' });
        }

        // Add user to followers
        if (!store.followers) {
            store.followers = [];
        }
        store.followers.push(userId);
        store.followerCount = store.followers.length;
        await store.save();

        res.status(200).json({
            message: 'Store followed successfully',
            followerCount: store.followerCount
        });
    } catch (error) {
        console.error('Error following store:', error);
        res.status(500).json({
            message: 'Error following store',
            error: error.message
        });
    }
};

// Unfollow a store
exports.unfollowStore = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const store = await Store.findById(id);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check if user follows
        if (!store.followers || !store.followers.includes(userId)) {
            return res.status(400).json({ message: 'You are not following this store' });
        }

        // Remove user from followers
        store.followers = store.followers.filter(followerId => followerId.toString() !== userId);
        store.followerCount = store.followers.length;
        await store.save();

        res.status(200).json({
            message: 'Store unfollowed successfully',
            followerCount: store.followerCount
        });
    } catch (error) {
        console.error('Error unfollowing store:', error);
        res.status(500).json({
            message: 'Error unfollowing store',
            error: error.message
        });
    }
};


// Update a store
exports.updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Update the store
        const store = await Store.findByIdAndUpdate(id, updates, {
            new: true,
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.status(200).json({
            message: 'Store updated successfully',
            store,
        });
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({
            message: 'Error updating store',
            error,
        });
    }
};

exports.updateStoreRating = async (storeId) => {
    try {
         // Fetch the store by its ID
         const store = await Store.findById(storeId).populate('coupons deals');
        
         if (!store) {
             console.error('Store not found');
             return;
         }
         
      const couponsAndDeals = await RateAndReview.find({
        $or: [{ couponId: { $in: store.coupons } }, { dealId: { $in: store.deals } }],
      });
  
      const totalRatings = couponsAndDeals.reduce((sum, item) => sum + item.rating, 0);
      const ratingCount = couponsAndDeals.length;
  
      const averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
  
      await Store.findByIdAndUpdate(storeId, {
        averageRating: averageRating.toFixed(2), // Keep it to 2 decimal places
        ratingCount,
      });
    } catch (error) {
      console.error('Error updating store rating:', error);
    }
  };

  exports.getUserDealAndCouponCounts = async (req, res) => {
    try {
        const { userId } = req.params;

        // Aggregation pipeline
        const result = await Store.aggregate([
            // Match stores belonging to the user
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            // Unwind the deals and coupons arrays
            {
                $facet: {
                    totalDeals: [
                        { $unwind: "$deals" },
                        { $count: "count" }
                    ],
                    totalCoupons: [
                        { $unwind: "$coupons" },
                        { $count: "count" }
                    ]
                }
            },
            {
                $project: {
                    totalDeals: { $arrayElemAt: ["$totalDeals.count", 0] },
                    totalCoupons: { $arrayElemAt: ["$totalCoupons.count", 0] },
                }
            }
        ]);

        // Handle if the user has no stores, deals, or coupons
        const counts = result[0] || { totalDeals: 0, totalCoupons: 0 };

        res.status(200).json({
            message: 'Total deals and coupons for the user fetched successfully',
            counts,
        });
    } catch (error) {
        console.error('Error aggregating user deals and coupons:', error);
        res.status(500).json({
            message: 'Error fetching deals and coupons for the user',
            error,
        });
    }
};
  

// Delete a store
exports.deleteStore = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findByIdAndDelete(id);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.status(200).json({ message: 'Store deleted successfully' });
    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({ message: 'Error deleting store', error });
    }
};
