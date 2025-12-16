/**
 * Script to seed Google Search Console verification meta tag
 * Usage: node scripts/seedGoogleVerification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SEOSettings = require('../models/seoSettings');

const GOOGLE_VERIFICATION_CONTENT = 'pVdil_RsoaCSqU6JuXyZSM3XRPHDX50ZELdxqI7lruE';

async function seedGoogleVerification() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get or create SEO settings
    console.log('Getting SEO settings...');
    let settings = await SEOSettings.findOne();
    if (!settings) {
      console.log('Creating new SEO settings document...');
      settings = await SEOSettings.create({});
    }

    // Update Google verification tag directly
    console.log('Updating Google verification tag...');
    settings.metaVerification.google = GOOGLE_VERIFICATION_CONTENT;
    settings.lastUpdated = new Date();
    await settings.save();

    console.log('✅ Successfully updated Google Search Console verification tag!');
    console.log('Verification content:', settings.metaVerification.google);
    console.log('Settings ID:', settings._id);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Google verification tag:', error);
    process.exit(1);
  }
}

// Run the script
seedGoogleVerification();

