/**
 * Fix Store Affiliate and Location Data
 * 
 * This script:
 * 1. Migrates stores from 'affiliates' array to 'affiliate' single field
 * 2. Fixes isWorldwide inconsistency (if availableCountries has 'WORLDWIDE', set isWorldwide to true)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Store = require('../models/store');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixStores() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all stores
    const stores = await Store.find({});
    console.log(`Found ${stores.length} stores to process`);

    let fixedCount = 0;
    let locationFixedCount = 0;

    for (const store of stores) {
      let needsUpdate = false;
      const updates = {};

      // Fix affiliate: migrate from affiliates array to affiliate field
      if (store.affiliates && Array.isArray(store.affiliates) && store.affiliates.length > 0) {
        // Take the first affiliate from the array
        updates.affiliate = store.affiliates[0];
        updates.$unset = { affiliates: '' }; // Remove the old field
        needsUpdate = true;
        console.log(`Store ${store.name}: Migrating affiliate from array to single field`);
      } else if (!store.affiliate && (!store.affiliates || store.affiliates.length === 0)) {
        // Store has no affiliate, ensure it's null
        updates.affiliate = null;
        if (store.affiliates) {
          updates.$unset = { affiliates: '' };
        }
        needsUpdate = true;
      }

      // Fix location: if availableCountries includes 'WORLDWIDE', ensure isWorldwide is true
      if (store.availableCountries && Array.isArray(store.availableCountries)) {
        const hasWorldwide = store.availableCountries.includes('WORLDWIDE');
        if (hasWorldwide && store.isWorldwide !== true) {
          updates.isWorldwide = true;
          needsUpdate = true;
          locationFixedCount++;
          console.log(`Store ${store.name}: Fixing isWorldwide (was ${store.isWorldwide}, setting to true)`);
        } else if (!hasWorldwide && store.isWorldwide === true && store.availableCountries.length > 0) {
          // If no WORLDWIDE but isWorldwide is true and there are specific countries, set to false
          updates.isWorldwide = false;
          needsUpdate = true;
          locationFixedCount++;
          console.log(`Store ${store.name}: Fixing isWorldwide (was true, setting to false)`);
        }
      }

      if (needsUpdate) {
        if (updates.$unset) {
          await Store.findByIdAndUpdate(store._id, updates);
        } else {
          await Store.findByIdAndUpdate(store._id, updates);
        }
        fixedCount++;
        console.log(`✓ Fixed store: ${store.name}`);
      }
    }

    console.log('\n========================================');
    console.log(`Migration complete!`);
    console.log(`- Stores with affiliate fixed: ${fixedCount}`);
    console.log(`- Stores with location fixed: ${locationFixedCount}`);
    console.log(`- Total stores processed: ${stores.length}`);
    console.log('========================================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing stores:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
fixStores();

