/**
 * Link an existing API key to a store and category
 * Run: RESET_USERNAME=dennisreact16 node server/scripts/linkApiKeyToStoreAndCategory.js
 * Or: node server/scripts/linkApiKeyToStoreAndCategory.js
 * 
 * Set env vars:
 *   API_KEY_NAME=modamai     (name of the API key to update)
 *   STORE_NAME=modamai       (store name - will find or create)
 *   CATEGORY_NAME=Fashion    (category name - must exist)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ApiKey = require('../models/apiKey');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');

const API_KEY_NAME = process.env.API_KEY_NAME || 'modamai';
const STORE_NAME = process.env.STORE_NAME || 'modamai';
const CATEGORY_NAME = process.env.CATEGORY_NAME || 'Fashion';

async function run() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('MONGO_URL not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    // Find API key by name
    const apiKey = await ApiKey.findOne({ name: API_KEY_NAME, isActive: true });
    if (!apiKey) {
      console.error(`API key "${API_KEY_NAME}" not found.`);
      process.exit(1);
    }
    console.log(`Found API key: ${apiKey.name} (${apiKey._id})`);

    // Find or create store
    let store = await Store.findOne({ name: new RegExp(`^${STORE_NAME}$`, 'i') });
    if (!store) {
      const user = await User.findById(apiKey.userId);
      if (!user) {
        console.error('API key user not found.');
        process.exit(1);
      }
      store = new Store({
        name: STORE_NAME,
        userId: user._id,
        url: `https://${STORE_NAME.toLowerCase().replace(/\s/g, '')}.com`,
      });
      await store.save();
      console.log(`Created store: ${store.name} (${store._id})`);
    } else {
      console.log(`Found store: ${store.name} (${store._id})`);
    }

    // Find category
    const category = await Category.findOne({ name: new RegExp(`^${CATEGORY_NAME}$`, 'i') });
    if (!category) {
      console.error(`Category "${CATEGORY_NAME}" not found. Create it first in Admin -> Categories.`);
      process.exit(1);
    }
    console.log(`Found category: ${category.name} (${category._id})`);

    // Update API key
    apiKey.storeId = store._id;
    apiKey.categoryId = category._id;
    await apiKey.save();

    console.log('\nAPI key updated successfully!');
    console.log(`  Key: ${apiKey.name}`);
    console.log(`  Store: ${store.name} (${store._id})`);
    console.log(`  Category: ${category.name} (${category._id})`);
    console.log('\nYour external app can now add coupons/deals without passing storeId or categoryId.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
