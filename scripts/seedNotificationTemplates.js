/**
 * Seed Notification Templates
 * Populates the database with default notification templates for admin and client
 * 
 * Usage: node server/scripts/seedNotificationTemplates.js
 */

const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const NotificationTemplate = require('../models/notificationTemplate');

// Load .env file from server directory (same as app.js)
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB using the same method as app.js
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    return false;
  }
};

// Default notification templates
const notificationTemplates = [
  // ========== ADMIN TEMPLATES ==========
  {
    name: 'new_user_registered',
    title: 'New User Registered',
    message: 'New user {userName} ({userEmail}) has registered on the platform',
    type: 'admin',
    category: 'user',
    placeholders: ['userName', 'userEmail'],
    icon: 'FiUser',
    color: '#10B981', // green
    priority: 'medium',
    description: 'Triggered when a new user registers',
  },
  {
    name: 'coupon_submitted',
    title: 'New Coupon Submitted',
    message: 'New coupon "{couponCode}" submitted by {userName} for {storeName}',
    type: 'admin',
    category: 'coupon',
    placeholders: ['couponCode', 'userName', 'storeName'],
    icon: 'FiTag',
    color: '#F59E0B', // amber
    priority: 'high',
    description: 'Triggered when a user submits a new coupon',
  },
  {
    name: 'coupon_approved',
    title: 'Coupon Approved',
    message: 'Coupon "{couponCode}" has been approved and is now live',
    type: 'admin',
    category: 'coupon',
    placeholders: ['couponCode'],
    icon: 'FiCheck',
    color: '#10B981', // green
    priority: 'medium',
    description: 'Triggered when an admin approves a coupon',
  },
  {
    name: 'coupon_rejected',
    title: 'Coupon Rejected',
    message: 'Coupon "{couponCode}" was rejected. Reason: {reason}',
    type: 'admin',
    category: 'coupon',
    placeholders: ['couponCode', 'reason'],
    icon: 'FiX',
    color: '#EF4444', // red
    priority: 'medium',
    description: 'Triggered when an admin rejects a coupon',
  },
  {
    name: 'deal_submitted',
    title: 'New Deal Submitted',
    message: 'New deal "{dealTitle}" submitted by {userName} for {storeName}',
    type: 'admin',
    category: 'deal',
    placeholders: ['dealTitle', 'userName', 'storeName'],
    icon: 'FiTag',
    color: '#F59E0B', // amber
    priority: 'high',
    description: 'Triggered when a user submits a new deal',
  },
  {
    name: 'store_created',
    title: 'New Store Created',
    message: 'New store "{storeName}" has been created by {userName}',
    type: 'admin',
    category: 'store',
    placeholders: ['storeName', 'userName'],
    icon: 'FiStore',
    color: '#8B5CF6', // purple
    priority: 'medium',
    description: 'Triggered when a new store is created',
  },
  {
    name: 'payment_received',
    title: 'Payment Received',
    message: 'Payment of ${amount} received from {userName} ({userEmail})',
    type: 'admin',
    category: 'payment',
    placeholders: ['amount', 'userName', 'userEmail'],
    icon: 'FiDollarSign',
    color: '#10B981', // green
    priority: 'high',
    description: 'Triggered when a payment is received',
  },
  {
    name: 'subscription_expiring',
    title: 'Subscription Expiring',
    message: 'Subscription for {userName} expires in {days} days',
    type: 'admin',
    category: 'subscription',
    placeholders: ['userName', 'days'],
    icon: 'FiClock',
    color: '#F59E0B', // amber
    priority: 'medium',
    description: 'Triggered when a subscription is about to expire',
  },
  {
    name: 'high_usage_coupon',
    title: 'High Usage Coupon',
    message: 'Coupon "{couponCode}" has high usage: {usageCount} uses',
    type: 'admin',
    category: 'coupon',
    placeholders: ['couponCode', 'usageCount'],
    icon: 'FiTrendingUp',
    color: '#3B82F6', // blue
    priority: 'low',
    description: 'Triggered when a coupon has unusually high usage',
  },
  {
    name: 'system_alert',
    title: 'System Alert',
    message: 'System alert: {message}',
    type: 'admin',
    category: 'system',
    placeholders: ['message'],
    icon: 'FiAlertCircle',
    color: '#EF4444', // red
    priority: 'urgent',
    description: 'System-wide alerts and notifications',
  },

  // ========== CLIENT TEMPLATES ==========
  {
    name: 'welcome',
    title: 'Welcome to DealCouponz!',
    message: 'Welcome {userName}! Start saving money with our exclusive coupons and deals.',
    type: 'client',
    category: 'system',
    placeholders: ['userName'],
    icon: 'FiStar',
    color: '#10B981', // green
    priority: 'medium',
    description: 'Welcome notification sent after user registration',
  },
  {
    name: 'coupon_approved',
    title: 'Coupon Approved!',
    message: 'Great news! Your coupon "{couponCode}" has been approved and is now live.',
    type: 'client',
    category: 'coupon',
    placeholders: ['couponCode'],
    icon: 'FiCheck',
    color: '#10B981', // green
    priority: 'high',
    description: 'Sent to user when their submitted coupon is approved',
  },
  {
    name: 'coupon_rejected',
    title: 'Coupon Rejected',
    message: 'Your coupon "{couponCode}" was rejected. Reason: {reason}. Please review and resubmit.',
    type: 'client',
    category: 'coupon',
    placeholders: ['couponCode', 'reason'],
    icon: 'FiX',
    color: '#EF4444', // red
    priority: 'high',
    description: 'Sent to user when their submitted coupon is rejected',
  },
  {
    name: 'deal_approved',
    title: 'Deal Approved!',
    message: 'Your deal "{dealTitle}" has been approved and is now live on the platform.',
    type: 'client',
    category: 'deal',
    placeholders: ['dealTitle'],
    icon: 'FiCheck',
    color: '#10B981', // green
    priority: 'high',
    description: 'Sent to user when their submitted deal is approved',
  },
  {
    name: 'coupon_expiring',
    title: 'Coupon Expiring Soon',
    message: 'Your saved coupon "{couponCode}" from {storeName} expires in {days} days. Use it now!',
    type: 'client',
    category: 'coupon',
    placeholders: ['couponCode', 'storeName', 'days'],
    icon: 'FiClock',
    color: '#F59E0B', // amber
    priority: 'medium',
    description: 'Sent to user when their saved coupon is about to expire',
  },
  {
    name: 'new_coupon_available',
    title: 'New Coupon Available!',
    message: 'New coupon available at {storeName}: {couponCode} - {discount} off!',
    type: 'client',
    category: 'coupon',
    placeholders: ['storeName', 'couponCode', 'discount'],
    icon: 'FiTag',
    color: '#3B82F6', // blue
    priority: 'medium',
    description: 'Sent when a new coupon is available for a store the user follows',
  },
  {
    name: 'deal_available',
    title: 'New Deal Available!',
    message: 'New deal available: {dealTitle} at {storeName} - Save {discount}!',
    type: 'client',
    category: 'deal',
    placeholders: ['dealTitle', 'storeName', 'discount'],
    icon: 'FiTag',
    color: '#3B82F6', // blue
    priority: 'medium',
    description: 'Sent when a new deal is available for a store the user follows',
  },
  {
    name: 'payment_success',
    title: 'Payment Successful',
    message: 'Your payment of ${amount} was processed successfully. Thank you!',
    type: 'client',
    category: 'payment',
    placeholders: ['amount'],
    icon: 'FiCheck',
    color: '#10B981', // green
    priority: 'high',
    description: 'Sent after a successful payment',
  },
  {
    name: 'payment_failed',
    title: 'Payment Failed',
    message: 'Your payment failed. Reason: {reason}. Please try again or contact support.',
    type: 'client',
    category: 'payment',
    placeholders: ['reason'],
    icon: 'FiX',
    color: '#EF4444', // red
    priority: 'high',
    description: 'Sent when a payment fails',
  },
  {
    name: 'subscription_active',
    title: 'Subscription Active',
    message: 'Your subscription is now active! Enjoy premium features and exclusive deals.',
    type: 'client',
    category: 'subscription',
    placeholders: [],
    icon: 'FiStar',
    color: '#10B981', // green
    priority: 'high',
    description: 'Sent when a subscription is activated',
  },
  {
    name: 'subscription_expiring',
    title: 'Subscription Expiring Soon',
    message: 'Your subscription expires in {days} days. Renew now to continue enjoying premium features.',
    type: 'client',
    category: 'subscription',
    placeholders: ['days'],
    icon: 'FiClock',
    color: '#F59E0B', // amber
    priority: 'medium',
    description: 'Sent before subscription expiration',
  },
  {
    name: 'referral_bonus',
    title: 'Referral Bonus Earned!',
    message: 'Congratulations! You earned ${amount} from your referral. Keep sharing to earn more!',
    type: 'client',
    category: 'achievement',
    placeholders: ['amount'],
    icon: 'FiGift',
    color: '#8B5CF6', // purple
    priority: 'medium',
    description: 'Sent when user earns referral bonus',
  },
  {
    name: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    message: 'Congratulations! You unlocked the "{achievementName}" achievement. Keep it up!',
    type: 'client',
    category: 'achievement',
    placeholders: ['achievementName'],
    icon: 'FiAward',
    color: '#8B5CF6', // purple
    priority: 'low',
    description: 'Sent when user unlocks an achievement',
  },
  {
    name: 'saved_coupon_used',
    title: 'Coupon Used Successfully',
    message: 'Your saved coupon "{couponCode}" from {storeName} was used successfully. Great savings!',
    type: 'client',
    category: 'coupon',
    placeholders: ['couponCode', 'storeName'],
    icon: 'FiCheck',
    color: '#10B981', // green
    priority: 'low',
    description: 'Sent when user successfully uses a saved coupon',
  },
];

// Seed function
const seedNotificationTemplates = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const templateData of notificationTemplates) {
      try {
        const existingTemplate = await NotificationTemplate.findOne({ name: templateData.name });

        if (existingTemplate) {
          // Update existing template
          await NotificationTemplate.findByIdAndUpdate(
            existingTemplate._id,
            { $set: templateData },
            { runValidators: true }
          );
          console.log(`✓ Updated: ${templateData.name}`);
          updated++;
        } else {
          // Create new template
          const template = new NotificationTemplate(templateData);
          await template.save();
          console.log(`✓ Created: ${templateData.name}`);
          created++;
        }
      } catch (error) {
        console.error(`✗ Error processing ${templateData.name}:`, error.message);
        skipped++;
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${notificationTemplates.length}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding notification templates:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seed
seedNotificationTemplates();


