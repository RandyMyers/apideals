/**
 * Check what userId and storeIds are linked to API keys
 * Run: node server/scripts/checkApiKeyLinks.js
 * 
 * Shows which userId each API key belongs to, and that user's stores (storeId)
 * so you know what IDs to use when calling the API from your external app.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ApiKey = require('../models/apiKey');
const Store = require('../models/store');
const User = require('../models/user');
const Category = require('../models/category');

async function checkApiKeyLinks() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');
    console.log('='.repeat(60));
    console.log('API KEY LINKS (userId, stores, categories)');
    console.log('='.repeat(60));

    const keys = await ApiKey.find({ isActive: true })
      .populate('userId', 'username email userType')
      .sort({ createdAt: -1 })
      .lean();

    if (!keys.length) {
      console.log('\nNo active API keys found.');
      process.exit(0);
    }

    for (const key of keys) {
      console.log(`\n--- API Key: ${key.keyPrefix}•••••••• (${key.name}) ---`);
      console.log(`  Key ID: ${key._id}`);

      if (!key.userId) {
        console.log('  userId: NOT LINKED (orphaned key)');
        continue;
      }

      const user = key.userId;
      const userId = user._id || user;
      const userIdStr = userId.toString();
      console.log(`  userId: ${userIdStr}`);
      console.log(`  user: ${user.username} (${user.email}) [${user.userType}]`);

      // Get stores owned by this user
      const stores = await Store.find({ userId: userIdStr }).select('_id name url').lean();
      console.log(`  stores (${stores.length}):`);
      if (stores.length === 0) {
        console.log('    (none - create a store first via API or admin)');
      } else {
        stores.forEach((s) => {
          console.log(`    - storeId: ${s._id}  |  ${s.name}  |  ${s.url || '-'}`);
        });
      }

      // Get categories (global - any user can use)
      const categories = await Category.find().select('_id name').limit(20).lean();
      console.log(`  categories (use any):`);
      categories.forEach((c) => {
        console.log(`    - categoryId: ${c._id}  |  ${c.name}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Use storeId and categoryId from above in your external app.');
    console.log('userId is derived from the API key - do NOT pass it in the body.');
    console.log('='.repeat(60));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkApiKeyLinks();
