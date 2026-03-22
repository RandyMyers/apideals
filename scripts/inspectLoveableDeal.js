/**
 * Inspect existing Loveable deal(s) in the database.
 * Run this to see the current structure before updating the seed script.
 *
 * Usage:
 *   node scripts/inspectLoveableDeal.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');
require('../models/category'); // Register for populate

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB\n');

    // Find stores that might be Loveable
    const stores = await Store.find({
      name: new RegExp('loveable|lovable', 'i'),
    }).lean();

    console.log('Stores matching "loveable":', stores.length);
    if (stores.length) {
      stores.forEach((s) => console.log('  -', s._id, s.name));
    }

    // Find deals for those stores
    if (stores.length > 0) {
      const storeIds = stores.map((s) => s._id);
      const deals = await Deal.find({ store: { $in: storeIds } })
        .populate('store', 'name')
        .populate('categoryId', 'name')
        .lean();

      console.log('\nDeals for Loveable store(s):', deals.length);
      if (deals.length > 0) {
        deals.forEach((d, i) => {
          console.log('\n--- Deal', i + 1, '---');
          console.log(JSON.stringify(d, null, 2));
        });
      }
    }

    // Also search deals by name/title containing "loveable"
    const dealsByName = await Deal.find({
      $or: [
        { name: new RegExp('loveable|lovable', 'i') },
        { title: new RegExp('loveable|lovable', 'i') },
        { description: new RegExp('loveable|lovable', 'i') },
      ],
    })
      .populate('store', 'name')
      .populate('categoryId', 'name')
      .lean();

    console.log('\nDeals with "loveable" in name/title/description:', dealsByName.length);
    if (dealsByName.length > 0) {
      dealsByName.forEach((d, i) => {
        console.log('\n--- Deal (by name)', i + 1, '---');
        console.log(JSON.stringify(d, null, 2));
      });
    }

    if (stores.length === 0 && dealsByName.length === 0) {
      console.log('\nNo Loveable store or deal found. The seed script will create a new deal when you run it.');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();
