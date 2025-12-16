/**
 * Test script to verify SEO settings public endpoint
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SEOSettings = require('../models/seoSettings');

async function testSEOEndpoint() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get SEO settings
    console.log('Fetching SEO settings...');
    const settings = await SEOSettings.getSettings();
    
    console.log('📋 SEO Settings:');
    console.log('  - ID:', settings._id);
    console.log('  - Meta Verification:', JSON.stringify(settings.metaVerification, null, 2));
    
    // Check if Google verification exists
    if (settings.metaVerification?.google) {
      console.log('\n✅ Google verification tag found:');
      console.log('   Content:', settings.metaVerification.google);
      console.log('   Expected meta tag:');
      console.log(`   <meta name="google-site-verification" content="${settings.metaVerification.google}" />`);
    } else {
      console.log('\n❌ Google verification tag is missing or empty!');
    }

    // Test what the public endpoint would return
    console.log('\n📤 Public endpoint would return:');
    const publicResponse = {
      metaVerification: settings.metaVerification || {
        google: '',
        bing: '',
        yandex: '',
        pinterest: '',
        facebook: '',
        custom: [],
      },
    };
    console.log(JSON.stringify(publicResponse, null, 2));

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSEOEndpoint();

