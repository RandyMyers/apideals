const cron = require('node-cron');
const User = require('../models/user');
const Coupon = require('../models/coupon');
const Subscription = require('../models/subscriptions');
const notificationService = require('../services/notificationService');

/**
 * Check for coupons expiring soon and notify users
 * Runs daily at 9 AM
 */
const checkExpiringCouponsJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[Notification Job] Starting expiring coupons check...');
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find users with followed coupons
    const users = await User.find({
      'FollowedCoupons.couponId': { $exists: true, $ne: null }
    }).populate({
      path: 'FollowedCoupons.couponId',
      select: 'code endDate storeId title',
      strictPopulate: false
    });

    let notificationsSent = 0;

    for (const user of users) {
      if (!user.FollowedCoupons || user.FollowedCoupons.length === 0) continue;

      for (const followedCoupon of user.FollowedCoupons) {
        if (!followedCoupon.couponId || !followedCoupon.couponId.endDate) continue;

        const endDate = new Date(followedCoupon.couponId.endDate);
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Notify if expiring in 7 days or less (but not expired)
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          try {
            // Get store name
            const Store = require('../models/store');
            const store = await Store.findById(followedCoupon.couponId.storeId).select('name').lean();
            
            await notificationService.createNotification(
              user._id,
              'coupon_expiring',
              {
                couponCode: followedCoupon.couponId.code || 'Your coupon',
                storeName: store?.name || 'Store',
                days: daysUntilExpiry
              },
              { actionUrl: `/coupons/${followedCoupon.couponId._id}` }
            );
            notificationsSent++;
          } catch (notifError) {
            console.error(`[Notification Job] Error sending coupon expiring notification to user ${user._id}:`, notifError);
          }
        }
      }
    }

    console.log(`[Notification Job] Expiring coupons check completed. Sent ${notificationsSent} notifications.`);
  } catch (error) {
    console.error('[Notification Job] Error checking expiring coupons:', error);
  }
});

/**
 * Check for subscriptions expiring soon and notify users and admins
 * Runs daily at 9 AM
 */
const checkExpiringSubscriptionsJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[Notification Job] Starting expiring subscriptions check...');
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find active subscriptions expiring in the next 7 days
    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    })
      .populate('userId', 'username email')
      .lean();

    let userNotificationsSent = 0;
    let adminNotificationsSent = 0;

    for (const subscription of expiringSubscriptions) {
      if (!subscription.userId) continue;

      const daysUntilExpiry = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));

      // Notify user
      try {
        await notificationService.createNotification(
          subscription.userId._id || subscription.userId,
          'subscription_expiring',
          { days: daysUntilExpiry },
          { actionUrl: '/dashboard/subscription' }
        );
        userNotificationsSent++;
      } catch (notifError) {
        console.error(`[Notification Job] Error sending subscription expiring notification to user ${subscription.userId._id}:`, notifError);
      }

      // Notify admins
      try {
        const adminUsers = await User.find({ 
          userType: { $in: ['superAdmin', 'couponManager'] } 
        }).select('_id').lean();
        
        if (adminUsers.length > 0) {
          const adminIds = adminUsers.map(admin => admin._id.toString());
          await notificationService.sendBulkNotifications(
            adminIds,
            'subscription_expiring',
            {
              userName: subscription.userId?.username || 'User',
              days: daysUntilExpiry
            }
          );
          adminNotificationsSent += adminUsers.length;
        }
      } catch (adminNotifError) {
        console.error('[Notification Job] Error sending admin subscription expiring notifications:', adminNotifError);
      }
    }

    console.log(`[Notification Job] Expiring subscriptions check completed. Sent ${userNotificationsSent} user notifications and ${adminNotificationsSent} admin notifications.`);
  } catch (error) {
    console.error('[Notification Job] Error checking expiring subscriptions:', error);
  }
});

/**
 * Initialize notification jobs
 * Call this from app.js
 */
const startNotificationJobs = () => {
  checkExpiringCouponsJob.start();
  checkExpiringSubscriptionsJob.start();
  console.log('[Notification Jobs] All notification jobs started');
};

/**
 * Stop notification jobs
 * For graceful shutdown
 */
const stopNotificationJobs = () => {
  checkExpiringCouponsJob.stop();
  checkExpiringSubscriptionsJob.stop();
  console.log('[Notification Jobs] All notification jobs stopped');
};

module.exports = {
  startNotificationJobs,
  stopNotificationJobs,
  checkExpiringCouponsJob,
  checkExpiringSubscriptionsJob
};

