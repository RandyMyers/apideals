/**
 * Delete all redirects from the database
 * 
 * Usage:
 * cd server
 * node scripts/deleteAllRedirects.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the UrlRedirect model
const UrlRedirect = require('../models/urlRedirect');

async function deleteAllRedirects() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Count existing redirects
    const count = await UrlRedirect.countDocuments();
    console.log(`📊 Found ${count} redirects in database\n`);

    if (count === 0) {
      console.log('✅ No redirects to delete');
      await mongoose.connection.close();
      return;
    }

    // Delete all redirects
    console.log('🗑️  Deleting all redirects...');
    const result = await UrlRedirect.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} redirects\n`);

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting redirects:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
deleteAllRedirects();



