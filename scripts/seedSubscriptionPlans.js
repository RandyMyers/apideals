const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SubscriptionPlan = require('../models/subscriptionPlan');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const plans = [
  {
    name: 'Free',
    description: 'Perfect for getting started. Manage a single store with basic features.',
    price: {
      monthly: 0,
      yearly: 0,
    },
    couponLimit: 5,
    dealLimit: 5,
    storeLimit: 1,
    creditsPerMonth: 0,
    accessToAnalytics: false,
    promoteCoupons: false,
    features: [
      '1 Store',
      '5 Coupons',
      '5 Deals',
      'Basic dashboard',
      'Email support',
    ],
    highlight: false,
    order: 1,
    colorTheme: '#6c757d',
    isActive: true,
  },
  {
    name: 'Basic',
    description: 'Great for small businesses. Manage multiple stores and track performance.',
    price: {
      monthly: 19.99,
      yearly: 199.99,
    },
    couponLimit: 50,
    dealLimit: 50,
    storeLimit: 5,
    creditsPerMonth: 0,
    accessToAnalytics: true,
    promoteCoupons: false,
    features: [
      '5 Stores',
      '50 Coupons',
      '50 Deals',
      'Advanced analytics',
      'Priority support',
      'Email notifications',
      'Export data',
    ],
    highlight: false,
    order: 2,
    colorTheme: '#007bff',
    isActive: true,
  },
  {
    name: 'Pro',
    description: 'For growing businesses. Unlimited resources and advanced marketing tools.',
    price: {
      monthly: 49.99,
      yearly: 499.99,
    },
    couponLimit: 500,
    dealLimit: 500,
    storeLimit: 25,
    creditsPerMonth: 100,
    accessToAnalytics: true,
    promoteCoupons: true,
    features: [
      '25 Stores',
      '500 Coupons',
      '500 Deals',
      'Advanced analytics',
      'Promote coupons/deals',
      'Campaign management',
      'Priority support',
      'API access',
      'Custom branding',
    ],
    highlight: true,
    order: 3,
    colorTheme: '#28a745',
    isActive: true,
  },
  {
    name: 'Enterprise',
    description: 'For large businesses. Unlimited everything with dedicated support.',
    price: {
      monthly: 199.99,
      yearly: 1999.99,
    },
    couponLimit: -1, // Unlimited
    dealLimit: -1, // Unlimited
    storeLimit: -1, // Unlimited
    creditsPerMonth: 500,
    accessToAnalytics: true,
    promoteCoupons: true,
    features: [
      'Unlimited Stores',
      'Unlimited Coupons',
      'Unlimited Deals',
      'Advanced analytics',
      'Promote coupons/deals',
      'Campaign management',
      'Dedicated support',
      'API access',
      'Custom branding',
      'White-label options',
      'Custom integrations',
    ],
    highlight: false,
    order: 4,
    colorTheme: '#dc3545',
    isActive: true,
  },
];

async function seedPlans() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('Error: MongoDB connection string not found in environment variables');
      console.error('Please set MONGODB_URI, MONGO_URI, or MONGO_URL in your .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Insert plans
    const insertedPlans = await SubscriptionPlan.insertMany(plans);
    console.log(`✅ Successfully seeded ${insertedPlans.length} subscription plans:`);
    
    insertedPlans.forEach((plan) => {
      console.log(`  - ${plan.name}: $${plan.price.monthly}/month (${plan.storeLimit} stores, ${plan.couponLimit} coupons, ${plan.dealLimit} deals)`);
    });

    // Create default Free plan subscription for all existing users (optional)
    // This would be done when a user signs up or can be done separately

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedPlans();

