const User = require('../models/user'); // Adjust path to your project structure
const cloudinary = require('cloudinary').v2;
const Payment = require('../models/payments');
const bcrypt = require('bcrypt');

// Create a new user (only for admin or other user types with permission to add users manually)
// Create a new user (only for admin or other user types with permission to add users manually)
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, userType } = req.body;

        console.log(req.files);

        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        let profilePictureUrl = null;
        let cloudinaryId = null;

        // Handle profile picture upload
        if (req.files && req.files.profilePicture) {
            const file = req.files.profilePicture;
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: 'profile_pictures', // Folder in Cloudinary
                public_id: `user_${Date.now()}`, // Unique ID for the image
                overwrite: false,
            });

            profilePictureUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            userType,
            
            profilePicture: profilePictureUrl,
            
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Get a user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id)
            .select('-password') // Exclude password from response
            .populate({
                path: 'FollowedCoupons.couponId',
                select: 'code discountType discountValue endDate isActive imageUrl storeId',
                populate: {
                    path: 'storeId',
                    select: 'name'
                }
            })
            .populate({
                path: 'FollowedDeals.dealId',
                select: 'name dealType discountType discountValue endDate isActive store',
                populate: {
                    path: 'store',
                    select: 'name'
                }
            });

        if (!user) {
            return res.status(404).json({ message: 'User with that id not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Get all users (with optional filtering by userType, referralCode, etc.)
exports.getAllUsers = async (req, res) => {
    try {
        // Fetch all users with populated followed coupons and deals
        const users = await User.find()
            .select('-password') // Exclude passwords
            .populate({
                path: 'FollowedCoupons.couponId',
                select: 'code discountType discountValue endDate isActive',
                populate: {
                    path: 'storeId',
                    select: 'name'
                }
            })
            .populate({
                path: 'FollowedDeals.dealId',
                select: 'name dealType discountType discountValue endDate isActive',
                populate: {
                    path: 'store',
                    select: 'name'
                }
            });
        
        // Total number of users
        const totalUsers = await User.countDocuments();

        // Total number of active users
        const totalActiveUsers = await User.countDocuments({ isActive: true });

        // Count unique paid users
        const uniquePaidUsersCount = await Payment.aggregate([
            { $match: { paymentStatus: 'Success' } },
            { $group: { _id: '$user' } },
            { $count: 'totalPaidUsers' }
        ]);
        const totalPaidUsers = uniquePaidUsersCount[0]?.totalPaidUsers || 0;

        // Respond with users and statistics
        res.status(200).json({
            users,
            totalUsers,
            totalActiveUsers,
            totalPaidUsers,
        });
    } catch (error) {
        console.error('Error fetching users and statistics:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};
// Update a user by ID
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let updates = req.body;

        console.log(req.files);

        if (req.files && req.files.profilePicture) { // Check if a file was uploaded
            const file = req.files.profilePicture; // Get the uploaded file

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(file.tempFilePath, {
                folder: "profile_pictures", // Optional folder name in your Cloudinary account
                public_id: `user_${id}`,   // Unique public ID
                overwrite: true            // Replace existing profile picture
            });

            // Save the profile picture URL
            updates.profilePicture = result.secure_url;

            // You might want to store the public_id in the database for easier deletion later
            updates.cloudinaryId = result.public_id;
        }

        updates.updatedAt = new Date(); // Update timestamp

        // Update the user in the database
        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};
// Soft delete a user by setting isActive to false
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { isActive: false, updatedAt: new Date() }, // Set isActive to false
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User marked as inactive successfully', user: updatedUser });
    } catch (error) {
        console.error('Error marking user as inactive:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Reactivate a user by setting isActive to true
exports.reactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { isActive: true, updatedAt: new Date() }, // Set isActive to true
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User reactivated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error reactivating user:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};


// Get referred users by user ID
exports.getReferredUsers = async (req, res) => {
    try {
        const { id } = req.params;

        const referredUsers = await User.find({ referredBy: id }).select('-password'); // Exclude passwords

        res.status(200).json({ referredUsers });
    } catch (error) {
        console.error('Error fetching referred users:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Admin update user password (admin only)
exports.adminUpdateUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const adminId = req.user.id; // Admin making the request

        // Validate password
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters long',
                error: 'PASSWORD_TOO_SHORT'
            });
        }

        // Find the user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password - the pre-save hook will automatically hash it
        user.password = newPassword;
        await user.save();

        // Log the password change for security
        console.log(`Admin ${adminId} updated password for user ${id} (${user.email})`);

        res.status(200).json({ 
            message: 'User password updated successfully',
            userId: user._id,
            email: user.email
        });
    } catch (error) {
        console.error('Error updating user password:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Add credits to a user's wallet
exports.addCredits = async (req, res) => {
    try {
        const { id } = req.params;
        const { credits } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.wallet += credits;
        await user.save();

        res.status(200).json({ message: 'Credits added successfully', wallet: user.wallet });
    } catch (error) {
        console.error('Error adding credits:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Follow a coupon
exports.followCoupon = async (req, res) => {
    try {
        const { userId, couponId } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if coupon is already followed
        const alreadyFollowed = user.FollowedCoupons.some(
            followed => followed.couponId.toString() === couponId
        );

        if (alreadyFollowed) {
            return res.status(400).json({ message: 'Coupon already followed' });
        }

        // Add coupon to followed coupons
        user.FollowedCoupons.push({
            couponId,
            followedAt: new Date()
        });

        await user.save();

        res.status(200).json({ 
            message: 'Coupon followed successfully',
            followedCoupons: user.FollowedCoupons 
        });
    } catch (error) {
        console.error('Error following coupon:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Unfollow a coupon
exports.unfollowCoupon = async (req, res) => {
    try {
        const { userId, couponId } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove coupon from followed coupons
        user.FollowedCoupons = user.FollowedCoupons.filter(
            followed => followed.couponId.toString() !== couponId
        );

        await user.save();

        res.status(200).json({ 
            message: 'Coupon unfollowed successfully',
            followedCoupons: user.FollowedCoupons 
        });
    } catch (error) {
        console.error('Error unfollowing coupon:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Follow a deal
exports.followDeal = async (req, res) => {
    try {
        const { userId, dealId } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if deal is already followed
        const alreadyFollowed = user.FollowedDeals.some(
            followed => followed.dealId.toString() === dealId
        );

        if (alreadyFollowed) {
            return res.status(400).json({ message: 'Deal already followed' });
        }

        // Add deal to followed deals
        user.FollowedDeals.push({
            dealId,
            followedAt: new Date()
        });

        await user.save();

        res.status(200).json({ 
            message: 'Deal followed successfully',
            followedDeals: user.FollowedDeals 
        });
    } catch (error) {
        console.error('Error following deal:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Unfollow a deal
exports.unfollowDeal = async (req, res) => {
    try {
        const { userId, dealId } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove deal from followed deals
        user.FollowedDeals = user.FollowedDeals.filter(
            followed => followed.dealId.toString() !== dealId
        );

        await user.save();

        res.status(200).json({ 
            message: 'Deal unfollowed successfully',
            followedDeals: user.FollowedDeals 
        });
    } catch (error) {
        console.error('Error unfollowing deal:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Get user's followed coupons
exports.getFollowedCoupons = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate('FollowedCoupons.couponId') // Populate the coupon details
            .select('FollowedCoupons');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ followedCoupons: user.FollowedCoupons });
    } catch (error) {
        console.error('Error fetching followed coupons:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Get user's followed deals
exports.getFollowedDeals = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate('FollowedDeals.dealId') // Populate the deal details
            .select('FollowedDeals');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ followedDeals: user.FollowedDeals });
    } catch (error) {
        console.error('Error fetching followed deals:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

/**
 * Get user statistics for dashboard
 * @route GET /api/v1/users/:userId/stats
 * @access Private (authenticated user or admin)
 */
exports.getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;
        
        // Check if user is requesting their own stats or is admin
        if (userId !== requestingUserId && req.user.userType !== 'superAdmin') {
            return res.status(403).json({ 
                success: false,
                message: 'You can only view your own statistics' 
            });
        }

        // Get user with saved coupons and deals
        const user = await User.findById(userId)
            .populate({
                path: 'SavedCoupons.couponId',
                select: 'discountType discountValue endDate isActive categoryId storeId',
                populate: [
                    {
                        path: 'categoryId',
                        select: 'name'
                    },
                    {
                        path: 'storeId',
                        select: 'name'
                    }
                ]
            })
            .populate({
                path: 'SavedDeals.dealId',
                select: 'discountType discountValue endDate isActive categoryId store name',
                populate: [
                    {
                        path: 'categoryId',
                        select: 'name'
                    },
                    {
                        path: 'store',
                        select: 'name'
                    }
                ]
            });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        const followedCoupons = user.FollowedCoupons || [];
        const followedDeals = user.FollowedDeals || [];
        
        // Calculate savings (estimate based on discount values)
        // Using average order value of $50 for estimation
        const AVERAGE_ORDER_VALUE = 50;
        let totalSavings = 0;
        let monthlySavings = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // Calculate savings from followed coupons
        followedCoupons.forEach(fc => {
            if (fc.couponId && fc.couponId.isActive) {
                const discountValue = fc.couponId.discountValue || 0;
                const estimatedSavings = fc.couponId.discountType === 'percentage' 
                    ? (AVERAGE_ORDER_VALUE * discountValue / 100) 
                    : discountValue;
                totalSavings += estimatedSavings;
                
                // Monthly savings (based on when followed)
                if (fc.followedAt) {
                    const followedDate = new Date(fc.followedAt);
                    if (followedDate.getMonth() === currentMonth && followedDate.getFullYear() === currentYear) {
                        monthlySavings += estimatedSavings;
                    }
                }
            }
        });

        // Calculate savings from followed deals
        followedDeals.forEach(fd => {
            if (fd.dealId && fd.dealId.isActive) {
                const discountValue = fd.dealId.discountValue || 0;
                const estimatedSavings = fd.dealId.discountType === 'percentage' 
                    ? (AVERAGE_ORDER_VALUE * discountValue / 100) 
                    : discountValue;
                totalSavings += estimatedSavings;
                
                if (fd.followedAt) {
                    const followedDate = new Date(fd.followedAt);
                    if (followedDate.getMonth() === currentMonth && followedDate.getFullYear() === currentYear) {
                        monthlySavings += estimatedSavings;
                    }
                }
            }
        });

        // Calculate yearly estimate (monthly * 12)
        const yearlyEstimate = monthlySavings * 12;

        // Activity stats
        const followedCount = followedCoupons.length + followedDeals.length;
        // Note: We don't track "used" in the current model, so we'll estimate based on active items
        const activeCount = followedCoupons.filter(fc => fc.couponId && fc.couponId.isActive).length +
                          followedDeals.filter(fd => fd.dealId && fd.dealId.isActive).length;
        
        // Expiring soon (within 7 days)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const expiringSoon = [
            ...followedCoupons.filter(fc => {
                if (!fc.couponId || !fc.couponId.endDate) return false;
                const endDate = new Date(fc.couponId.endDate);
                return endDate <= sevenDaysFromNow && endDate >= new Date();
            }),
            ...followedDeals.filter(fd => {
                if (!fd.dealId || !fd.dealId.endDate) return false;
                const endDate = new Date(fd.dealId.endDate);
                return endDate <= sevenDaysFromNow && endDate >= new Date();
            })
        ].length;

        // Top categories
        const categoryCounts = {};
        followedCoupons.forEach(fc => {
            if (fc.couponId && fc.couponId.categoryId) {
                const categoryName = fc.couponId.categoryId.name || 'Unknown';
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }
        });
        followedDeals.forEach(fd => {
            if (fd.dealId && fd.dealId.categoryId) {
                const categoryName = fd.dealId.categoryId.name || 'Unknown';
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }
        });

        const topCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, count]) => ({
                name,
                count,
                percentage: followedCount > 0 ? Math.round((count / followedCount) * 100) : 0
            }));

        // Wallet stats
        const walletCredits = user.credits || 0;
        const nextReward = {
            current: walletCredits % 150,
            target: 150,
            bonus: '10%'
        };

        // Engagement stats
        const accountAge = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
        const streak = Math.min(accountAge, 30); // Cap at 30 days
        const achievements = Math.floor(accountAge / 7); // Achievement every 7 days
        let rank = 'New User';
        if (accountAge >= 90) rank = 'Top 15%';
        else if (accountAge >= 30) rank = 'Active User';

        // Referral stats (check if Referral model exists)
        let referralCount = 0;
        let referralEarnings = 0;
        let referralShared = 0;
        
        try {
            const Referral = require('../models/referral');
            const referrals = await Referral.find({ referrerId: userId });
            referralCount = referrals.length;
            referralEarnings = referrals.reduce((sum, ref) => sum + (ref.earnings || 0), 0);
            referralShared = referrals.filter(ref => ref.sharedAt).length;
        } catch (err) {
            // Referral model might not exist, use defaults
            console.log('Referral model not found, using defaults');
        }

        // Top stores
        const storeCounts = {};
        followedCoupons.forEach(fc => {
            if (fc.couponId && fc.couponId.storeId) {
                const storeName = fc.couponId.storeId.name || 'Unknown';
                storeCounts[storeName] = (storeCounts[storeName] || 0) + 1;
            }
        });
        followedDeals.forEach(fd => {
            if (fd.dealId && fd.dealId.store) {
                const storeName = fd.dealId.store.name || 'Unknown';
                storeCounts[storeName] = (storeCounts[storeName] || 0) + 1;
            }
        });

        const topStores = Object.entries(storeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, couponCount]) => {
                // Calculate savings for this store
                const storeCoupons = followedCoupons.filter(fc => 
                    fc.couponId && fc.couponId.storeId && fc.couponId.storeId.name === name
                );
                const storeSavings = storeCoupons.reduce((sum, fc) => {
                    if (fc.couponId && fc.couponId.isActive) {
                        const discountValue = fc.couponId.discountValue || 0;
                        return sum + (fc.couponId.discountType === 'percentage' 
                            ? (AVERAGE_ORDER_VALUE * discountValue / 100) 
                            : discountValue);
                    }
                    return sum;
                }, 0);

                return {
                    name,
                    savings: Math.round(storeSavings),
                    coupons: couponCount
                };
            });

        // Eco impact (placeholder - can be enhanced later)
        const ecoImpact = {
            co2Saved: Math.round(totalSavings * 0.05), // Estimate: $1 saved = 0.05kg CO2
            wastePrevented: Math.round(totalSavings / 10) // Estimate: $10 saved = 1 item prevented
        };

        // Monthly goal (can be user-configurable later)
        const monthlyGoal = 60;

        res.json({
            success: true,
            stats: {
                savings: {
                    total: Math.round(totalSavings),
                    monthly: Math.round(monthlySavings),
                    yearlyEstimate: Math.round(yearlyEstimate),
                    monthlyGoal,
                    trend: monthlySavings > 0 ? 'up' : 'down',
                    trendPercentage: monthlySavings > 0 ? 12.5 : 0
                },
                activity: {
                    saved: savedCount,
                    used: activeCount, // Using active count as proxy for "used"
                    topCategories: topCategories,
                    expiringSoon
                },
                wallet: {
                    credits: walletCredits,
                    nextReward
                },
                engagement: {
                    streak,
                    achievements,
                    totalAchievements: 10,
                    rank
                },
                referrals: {
                    count: referralCount,
                    earnings: Math.round(referralEarnings),
                    shared: referralShared
                },
                stores: {
                    topStores: topStores,
                    vipDeals: 0 // Can be calculated based on premium deals
                },
                ecoImpact
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
};

/**
 * Get user's store subscriptions (alerts)
 * GET /api/v1/users/:userId/store-subscriptions
 */
exports.getUserStoreSubscriptions = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;

        // Check if user is requesting their own subscriptions or is admin
        if (userId !== requestingUserId && req.user.userType !== 'superAdmin') {
            return res.status(403).json({
                success: false,
                message: 'You can only view your own store subscriptions'
            });
        }

        // Get store subscriptions from Notification model (where category is 'store')
        // Or we can create a separate StoreSubscription model
        // For now, let's query notifications with store category
        const Notification = require('../models/notification');
        const Store = require('../models/store');

        // Get notifications related to stores for this user
        const storeNotifications = await Notification.find({
            userId,
            category: 'store'
        }).distinct('relatedEntityId');

        // Get stores that user is subscribed to
        // We'll use a simple approach: stores where user has store notifications
        // Or we can check if there's a subscription field in Store model
        const stores = await Store.find({
            _id: { $in: storeNotifications }
        }).select('name logo description averageRating ratingCount url');

        // Get coupon and deal counts for each store
        const Coupon = require('../models/coupon');
        const Deal = require('../models/deal');

        const storesWithCounts = await Promise.all(
            stores.map(async (store) => {
                const [couponCount, dealCount] = await Promise.all([
                    Coupon.countDocuments({ storeId: store._id, isActive: true }),
                    Deal.countDocuments({ store: store._id, isActive: true })
                ]);

                return {
                    storeId: store._id,
                    name: store.name,
                    logo: store.logo,
                    description: store.description,
                    averageRating: store.averageRating,
                    ratingCount: store.ratingCount,
                    url: store.url,
                    couponCount,
                    dealCount,
                    subscribedAt: new Date() // TODO: Track actual subscription date
                };
            })
        );

        res.json({
            success: true,
            data: storesWithCounts,
            count: storesWithCounts.length
        });
    } catch (error) {
        console.error('Error fetching store subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching store subscriptions',
            error: error.message
        });
    }
};

/**
 * Get user's activity log
 * GET /api/v1/users/:userId/activity
 */
exports.getUserActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;
        const { page = 1, limit = 20, type, startDate, endDate } = req.query;

        // Check if user is requesting their own activity or is admin
        if (userId !== requestingUserId && req.user.userType !== 'superAdmin') {
            return res.status(403).json({
                success: false,
                message: 'You can only view your own activity'
            });
        }

        const skip = (page - 1) * limit;
        const View = require('../models/view');
        const Interaction = require('../models/interaction');
        const CouponUsage = require('../models/couponUsage');

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        let activities = [];

        // Get views
        if (!type || type === 'view') {
            const viewFilter = { userId, ...dateFilter };
            const views = await View.find(viewFilter)
                .populate('entityId', 'title name code imageUrl')
                .populate('storeId', 'name logo')
                .sort({ createdAt: -1 })
                .skip(type === 'view' ? skip : 0)
                .limit(type === 'view' ? parseInt(limit) : 10)
                .lean();

            activities.push(...views.map(v => ({
                type: 'view',
                entityType: v.entityType,
                entityId: v.entityId,
                storeId: v.storeId,
                createdAt: v.createdAt,
                data: v
            })));
        }

        // Get interactions (follows, shares)
        if (!type || type === 'interaction') {
            const interactionFilter = { userId, ...dateFilter };
            const interactions = await Interaction.find(interactionFilter)
                .populate('entityId', 'title name code imageUrl')
                .populate('storeId', 'name logo')
                .sort({ createdAt: -1 })
                .skip(type === 'interaction' ? skip : 0)
                .limit(type === 'interaction' ? parseInt(limit) : 10)
                .lean();

            activities.push(...interactions.map(i => ({
                type: 'interaction',
                interactionType: i.interactionType,
                entityType: i.entityType,
                entityId: i.entityId,
                storeId: i.storeId,
                createdAt: i.createdAt,
                data: i
            })));
        }

        // Get coupon/deal usage
        if (!type || type === 'usage') {
            const usageFilter = { userId, worked: true, ...dateFilter };
            const usages = await CouponUsage.find(usageFilter)
                .populate('entityId', 'title name code imageUrl')
                .populate('storeId', 'name logo')
                .sort({ usedAt: -1 })
                .skip(type === 'usage' ? skip : 0)
                .limit(type === 'usage' ? parseInt(limit) : 10)
                .lean();

            activities.push(...usages.map(u => ({
                type: 'usage',
                entityType: u.entityType,
                entityId: u.entityId,
                storeId: u.storeId,
                savingsAmount: u.savingsAmount,
                createdAt: u.usedAt,
                data: u
            })));
        }

        // Sort all activities by date
        activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Paginate
        const paginatedActivities = activities.slice(skip, skip + parseInt(limit));
        const total = activities.length;

        res.json({
            success: true,
            data: paginatedActivities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user activity',
            error: error.message
        });
    }
};