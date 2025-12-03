/**
 * Import redirects directly to MongoDB
 * This script runs in the server context and uses the existing MongoDB connection
 * 
 * Usage:
 * cd server
 * node scripts/importRedirects.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Import the UrlRedirect model
const UrlRedirect = require('../models/urlRedirect');

/**
 * Import redirects from JSON file
 */
async function importRedirects() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Read redirects file
    const redirectsFile = path.join(__dirname, '../../migration-data/redirects-bulk-import.json');
    
    if (!fs.existsSync(redirectsFile)) {
      console.error('❌ Error: redirects-bulk-import.json not found');
      console.error('   Run extractWordPressUrls.js first');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(redirectsFile, 'utf8');
    const { redirects } = JSON.parse(fileContent);

    console.log(`📥 Importing ${redirects.length} redirects...\n`);

    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    // Process each redirect
    for (let i = 0; i < redirects.length; i++) {
      const redirectData = redirects[i];
      
      try {
        const { oldPath, newPath, redirectType = 301, referenceType, referenceId, notes } = redirectData;

        if (!oldPath || !newPath) {
          results.errors.push({ redirect: redirectData, error: 'Missing oldPath or newPath' });
          continue;
        }

        // Normalize oldPath (remove trailing slash, lowercase)
        const normalizedOldPath = oldPath.toLowerCase().replace(/\/$/, '');
        if (!normalizedOldPath.startsWith('/')) {
          redirectData.oldPath = '/' + normalizedOldPath;
        } else {
          redirectData.oldPath = normalizedOldPath;
        }

        // Check if redirect already exists
        const existing = await UrlRedirect.findOne({ oldPath: redirectData.oldPath });
        if (existing) {
          results.skipped++;
          if ((i + 1) % 50 === 0) {
            console.log(`   Processed ${i + 1}/${redirects.length}...`);
          }
          continue;
        }

        // Create new redirect
        const redirect = new UrlRedirect({
          oldPath: redirectData.oldPath,
          newPath,
          redirectType,
          referenceType,
          referenceId,
          notes
        });

        await redirect.save();
        results.created++;

        // Progress indicator
        if ((i + 1) % 50 === 0) {
          console.log(`   Processed ${i + 1}/${redirects.length}...`);
        }
      } catch (error) {
        results.errors.push({ redirect: redirectData, error: error.message });
      }
    }

    console.log('\n✅ Import complete!\n');
    console.log('📊 Results:');
    console.log(`   ✅ Created: ${results.created}`);
    console.log(`   ⏭️  Skipped: ${results.skipped} (already exist)`);
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      console.log('\n   Error details:');
      results.errors.slice(0, 10).forEach((err, i) => {
        console.log(`      ${i + 1}. ${err.error}`);
        if (err.redirect?.oldPath) {
          console.log(`         Path: ${err.redirect.oldPath}`);
        }
      });
      if (results.errors.length > 10) {
        console.log(`      ... and ${results.errors.length - 10} more errors`);
      }
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing redirects:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the import
importRedirects();



