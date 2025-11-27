const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const HelpArticle = require('../models/helpArticle');

// Load .env file from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const helpArticleData = [
  {
    title: 'Getting Started with DealCouponz',
    slug: 'getting-started-with-dealcouponz',
    content: `
      <h2>Welcome to DealCouponz!</h2>
      <p>DealCouponz is your one-stop destination for finding the best coupons and deals. This guide will help you get started.</p>
      
      <h3>Creating Your Account</h3>
      <p>To get started, create a free account by clicking the "Sign Up" button. You'll need:</p>
      <ul>
        <li>A valid email address</li>
        <li>A secure password</li>
      </ul>
      
      <h3>Finding Coupons</h3>
      <p>Browse coupons by store, category, or use the search function to find specific deals.</p>
      
      <h3>Using Coupon Codes</h3>
      <p>Click on any coupon to view details and get the code. Copy the code and apply it at checkout on the merchant's website.</p>
      
      <h3>Next Steps</h3>
      <p>Explore our categories, save your favorite stores, and start saving money today!</p>
    `,
    excerpt: 'Learn how to get started with DealCouponz and start saving money with coupons and deals.',
    category: 'getting-started',
    tags: ['beginner', 'getting-started', 'guide'],
    order: 1,
    isPublished: true,
  },
  {
    title: 'How to Use Coupon Codes',
    slug: 'how-to-use-coupon-codes',
    content: `
      <h2>Using Coupon Codes</h2>
      <p>Here's a step-by-step guide on how to use coupon codes:</p>
      
      <h3>Step 1: Find a Coupon</h3>
      <p>Browse our extensive database of coupons or search for a specific store or product.</p>
      
      <h3>Step 2: Get the Code</h3>
      <p>Click on the coupon you want to use. You'll see the coupon code and any terms and conditions.</p>
      
      <h3>Step 3: Visit the Store</h3>
      <p>Click the "Get Deal" or "Shop Now" button to be redirected to the merchant's website.</p>
      
      <h3>Step 4: Apply the Code</h3>
      <p>Add items to your cart and proceed to checkout. Look for a field labeled "Promo Code", "Coupon Code", "Discount Code", or similar.</p>
      
      <h3>Step 5: Enter and Apply</h3>
      <p>Paste or type the coupon code into the field and click "Apply" or "Submit". The discount should be applied to your order.</p>
      
      <h3>Tips</h3>
      <ul>
        <li>Check expiration dates</li>
        <li>Read terms and conditions</li>
        <li>Some codes may have minimum purchase requirements</li>
        <li>Codes are usually case-sensitive</li>
      </ul>
    `,
    excerpt: 'A comprehensive guide on how to use coupon codes when shopping online.',
    category: 'getting-started',
    tags: ['coupons', 'how-to', 'guide'],
    order: 2,
    isPublished: true,
  },
  {
    title: 'Managing Your Account',
    slug: 'managing-your-account',
    content: `
      <h2>Managing Your Account</h2>
      <p>Learn how to manage your DealCouponz account settings and preferences.</p>
      
      <h3>Account Settings</h3>
      <p>Access your account settings from the profile menu. Here you can:</p>
      <ul>
        <li>Update your email address</li>
        <li>Change your password</li>
        <li>Manage email preferences</li>
        <li>Update profile information</li>
      </ul>
      
      <h3>Wallet Management</h3>
      <p>Your wallet allows you to:</p>
      <ul>
        <li>Add funds for premium features</li>
        <li>View transaction history</li>
        <li>Manage payment methods</li>
      </ul>
      
      <h3>Privacy Settings</h3>
      <p>Control what information is visible and manage your privacy preferences.</p>
    `,
    excerpt: 'Learn how to manage your account settings, wallet, and privacy preferences.',
    category: 'account',
    tags: ['account', 'settings', 'profile'],
    order: 1,
    isPublished: true,
  },
  {
    title: 'Payment Methods and Security',
    slug: 'payment-methods-and-security',
    content: `
      <h2>Payment Methods and Security</h2>
      <p>DealCouponz uses secure payment processing to protect your financial information.</p>
      
      <h3>Accepted Payment Methods</h3>
      <p>We accept various payment methods including:</p>
      <ul>
        <li>Credit and debit cards</li>
        <li>Online payment gateways (Flutterwave, etc.)</li>
        <li>Other regional payment options</li>
      </ul>
      
      <h3>Security Measures</h3>
      <p>Your payment information is protected through:</p>
      <ul>
        <li>SSL encryption</li>
        <li>Secure payment gateways</li>
        <li>PCI DSS compliance</li>
        <li>No storage of full card details</li>
      </ul>
      
      <h3>Transaction Safety</h3>
      <p>All transactions are processed securely, and you'll receive confirmation emails for each transaction.</p>
    `,
    excerpt: 'Learn about accepted payment methods and our security measures.',
    category: 'payments',
    tags: ['payment', 'security', 'billing'],
    order: 1,
    isPublished: true,
  },
  {
    title: 'Troubleshooting Common Issues',
    slug: 'troubleshooting-common-issues',
    content: `
      <h2>Troubleshooting Common Issues</h2>
      <p>Here are solutions to common problems you might encounter:</p>
      
      <h3>Coupon Code Not Working</h3>
      <p>If a coupon code doesn't work:</p>
      <ul>
        <li>Check if the code has expired</li>
        <li>Verify you copied it correctly</li>
        <li>Check for minimum purchase requirements</li>
        <li>Ensure it applies to your items</li>
        <li>Try clearing your browser cache</li>
      </ul>
      
      <h3>Login Issues</h3>
      <p>If you can't log in:</p>
      <ul>
        <li>Check your email and password</li>
        <li>Use password reset if needed</li>
        <li>Clear browser cookies</li>
        <li>Try a different browser</li>
      </ul>
      
      <h3>Payment Issues</h3>
      <p>If you have payment problems:</p>
      <ul>
        <li>Verify your payment method</li>
        <li>Check your account balance</li>
        <li>Contact your bank if needed</li>
        <li>Contact our support team</li>
      </ul>
    `,
    excerpt: 'Solutions to common issues and problems you might encounter on DealCouponz.',
    category: 'troubleshooting',
    tags: ['help', 'troubleshooting', 'support'],
    order: 1,
    isPublished: true,
  },
];

const seedHelpArticles = async () => {
  try {
    // Use the same connection method as app.js
    const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/dealcouponz';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log('Connected to MongoDB');

    // Clear existing help articles first
    const deletedCount = await HelpArticle.deleteMany({});
    console.log(`Cleared ${deletedCount.deletedCount} existing help article(s)`);

    // Insert help articles
    let created = 0;
    let errors = 0;

    for (const article of helpArticleData) {
      try {
        await HelpArticle.create(article);
        console.log(`✓ Created help article: ${article.title}`);
        created++;
      } catch (err) {
        if (err.code === 8000 || err.codeName === 'AtlasError') {
          console.error(`✗ Collection limit reached. Cannot create "helparticles" collection.`);
          console.error('Please create the collection manually in MongoDB Atlas or upgrade your plan.');
          errors++;
          break;
        } else {
          console.error(`✗ Error creating article "${article.title}":`, err.message);
          errors++;
        }
      }
    }

    console.log(`\nHelp articles seeding completed! Created: ${created}, Errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    if (error.code === 8000 || error.codeName === 'AtlasError') {
      console.error('\n✗ MongoDB Atlas Collection Limit Reached (500/500)');
      console.error('Solution options:');
      console.error('1. Create "helparticles" collection manually in MongoDB Atlas UI');
      console.error('2. Delete unused collections to free up space');
      console.error('3. Upgrade your MongoDB Atlas plan');
      console.error('\nAfter creating the collection, run this script again.');
    } else {
      console.error('Error seeding help articles:', error);
    }
    process.exit(1);
  }
};

seedHelpArticles();

