const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const FAQ = require('../models/faq');

// Load .env file from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const faqData = [
  {
    question: 'What is DealCouponz?',
    answer: 'DealCouponz is a platform that helps you discover and save money with the best coupons, deals, and discounts from thousands of stores. We aggregate coupon codes, promotional offers, and exclusive deals to help you save on your purchases.',
    category: 'general',
    order: 1,
    isPublished: true,
  },
  {
    question: 'How do I use a coupon code?',
    answer: 'To use a coupon code: 1) Browse or search for coupons from your favorite store, 2) Click on the coupon you want to use, 3) Copy the coupon code or click the link to be redirected to the store, 4) At checkout, paste the code in the promo/coupon field, and 5) Apply the code to see your discount.',
    category: 'coupons',
    order: 1,
    isPublished: true,
  },
  {
    question: 'Are all coupons verified?',
    answer: 'We do our best to verify coupon codes regularly. However, coupon codes can expire or reach their usage limit at any time. If you find a coupon that doesn\'t work, please report it so we can update our database.',
    category: 'coupons',
    order: 2,
    isPublished: true,
  },
  {
    question: 'How do I create an account?',
    answer: 'Creating an account is free and easy. Click on the "Sign Up" or "Register" button in the top right corner, fill in your email address and create a password, verify your email if required, and you\'re all set!',
    category: 'account',
    order: 1,
    isPublished: true,
  },
  {
    question: 'Can I submit my own coupons?',
    answer: 'Yes! If you find a great coupon that we don\'t have, you can submit it through our "Submit Coupon" page. Our team will review and verify it before adding it to our database.',
    category: 'coupons',
    order: 3,
    isPublished: true,
  },
  {
    question: 'How does the wallet system work?',
    answer: 'Our wallet system allows you to add funds to your account for various services like boosting coupons, running campaigns, or making premium purchases. You can add funds using various payment methods, and your balance will be securely stored in your wallet.',
    category: 'payment',
    order: 1,
    isPublished: true,
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept multiple payment methods including credit cards, debit cards, and various online payment gateways like Flutterwave. The available payment methods may vary by region.',
    category: 'payment',
    order: 2,
    isPublished: true,
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Yes, we take security seriously. All payment information is processed through secure, encrypted payment gateways. We do not store your full credit card information on our servers.',
    category: 'payment',
    order: 3,
    isPublished: true,
  },
  {
    question: 'How do I report a problem with a coupon or deal?',
    answer: 'If you encounter any issues with a coupon, deal, or have any other problems, please use our "Report Issue" page. Our support team will review and address your concern as soon as possible.',
    category: 'general',
    order: 2,
    isPublished: true,
  },
  {
    question: 'How do I unsubscribe from emails?',
    answer: 'You can unsubscribe from promotional emails by clicking the unsubscribe link at the bottom of any email we send, or by updating your email preferences in your account settings.',
    category: 'account',
    order: 2,
    isPublished: true,
  },
  {
    question: 'Can I track my savings?',
    answer: 'Yes! When you use coupons through our platform, you can track your savings in your account dashboard. This feature helps you see how much money you\'ve saved using our coupons and deals.',
    category: 'account',
    order: 3,
    isPublished: true,
  },
  {
    question: 'What should I do if a coupon code doesn\'t work?',
    answer: 'If a coupon code doesn\'t work, first make sure you copied it correctly and that it hasn\'t expired. Check if there are any restrictions (minimum purchase, specific products, etc.). If it still doesn\'t work, please report it so we can investigate and update our database.',
    category: 'technical',
    order: 1,
    isPublished: true,
  },
];

const seedFAQs = async () => {
  try {
    // Use the same connection method as app.js
    const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/dealcouponz';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log('Connected to MongoDB');

    // Clear existing FAQs first
    const deletedCount = await FAQ.deleteMany({});
    console.log(`Cleared ${deletedCount.deletedCount} existing FAQ(s)`);

    // Insert FAQs
    let created = 0;
    let errors = 0;

    for (const faq of faqData) {
      try {
        await FAQ.create(faq);
        console.log(`✓ Created FAQ: ${faq.question}`);
        created++;
      } catch (err) {
        if (err.code === 8000 || err.codeName === 'AtlasError') {
          console.error(`✗ Collection limit reached. Cannot create "faqs" collection.`);
          console.error('Please create the collection manually in MongoDB Atlas or upgrade your plan.');
          errors++;
          break;
        } else {
          console.error(`✗ Error creating FAQ "${faq.question}":`, err.message);
          errors++;
        }
      }
    }

    console.log(`\nFAQ seeding completed! Created: ${created}, Errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    if (error.code === 8000 || error.codeName === 'AtlasError') {
      console.error('\n✗ MongoDB Atlas Collection Limit Reached (500/500)');
      console.error('Solution options:');
      console.error('1. Create "faqs" collection manually in MongoDB Atlas UI');
      console.error('2. Delete unused collections to free up space');
      console.error('3. Upgrade your MongoDB Atlas plan');
      console.error('\nAfter creating the collection, run this script again.');
    } else {
      console.error('Error seeding FAQs:', error);
    }
    process.exit(1);
  }
};

seedFAQs();

