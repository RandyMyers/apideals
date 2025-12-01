/**
 * Test script to debug WooCommerce API connection and data fetching
 * Usage: node scripts/testWooCommerce.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const Store = require('../models/store');

const testWooCommerce = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    if (!process.env.MONGO_URL) {
      console.error('❌ Error: MONGO_URL environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find Trendykool store or any WooCommerce store
    console.log('🔍 Searching for WooCommerce stores...');
    const stores = await Store.find({ storeType: 'woocommerce' }).lean();
    console.log(`📊 Found ${stores.length} WooCommerce store(s)\n`);

    if (stores.length === 0) {
      console.log('❌ No WooCommerce stores found in database');
      console.log('💡 Searching for stores with API keys...');
      const storesWithKeys = await Store.find({
        apiKey: { $exists: true, $ne: null, $ne: '' },
        secretKey: { $exists: true, $ne: null, $ne: '' }
      }).lean();
      console.log(`📊 Found ${storesWithKeys.length} store(s) with API keys\n`);
      
      if (storesWithKeys.length > 0) {
        console.log('Stores with API keys:');
        storesWithKeys.forEach((store, idx) => {
          console.log(`  ${idx + 1}. ${store.name} (ID: ${store._id})`);
          console.log(`     URL: ${store.url}`);
          console.log(`     Store Type: ${store.storeType || 'not set'}`);
          console.log(`     Has API Key: ${!!store.apiKey}`);
          console.log(`     Has Secret Key: ${!!store.secretKey}\n`);
        });
      }
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // Test with the first store (or Trendykool if found)
    let testStore = stores.find(s => s.name && s.name.toLowerCase().includes('trendykool')) || stores[0];
    console.log(`🧪 Testing with store: ${testStore.name} (ID: ${testStore._id})`);
    console.log(`   URL: ${testStore.url}`);
    console.log(`   API Key: ${testStore.apiKey ? testStore.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
    console.log(`   Secret Key: ${testStore.secretKey ? testStore.secretKey.substring(0, 10) + '...' : 'MISSING'}\n`);

    if (!testStore.apiKey || !testStore.secretKey) {
      console.error('❌ Store is missing API credentials');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Build WooCommerce client
    console.log('🔧 Building WooCommerce client...');
    const client = new WooCommerceRestApi({
      url: testStore.url,
      consumerKey: testStore.apiKey,
      consumerSecret: testStore.secretKey,
      version: 'wc/v3',
    });
    console.log('✅ Client built successfully\n');

    // Test connection with system status
    console.log('🔍 Testing connection with system_status endpoint...');
    try {
      const systemStatus = await client.get('system_status');
      console.log('✅ Connection successful!');
      console.log('   Response status:', systemStatus.status);
      console.log('   Response data type:', typeof systemStatus.data);
      console.log('   Response keys:', systemStatus.data && typeof systemStatus.data === 'object' ? Object.keys(systemStatus.data) : 'N/A');
      console.log('');
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      console.log('');
    }

    // Test fetching coupons
    console.log('🎫 Testing coupons endpoint...');
    try {
      const couponsResp = await client.get('coupons', { per_page: 10, page: 1 });
      console.log('✅ Coupons request successful!');
      console.log('   Response status:', couponsResp.status);
      console.log('   Response type:', typeof couponsResp);
      console.log('   Response.data type:', typeof couponsResp.data);
      console.log('   Response.data is array:', Array.isArray(couponsResp.data));
      
      // Handle string response - parse it as JSON
      let couponsData = couponsResp.data;
      if (typeof couponsResp.data === 'string') {
        console.log('   ⚠️  Response.data is a string, attempting to parse as JSON...');
        console.log('   String length:', couponsResp.data.length);
        
        // Try to extract JSON part if HTML is mixed in
        let jsonString = couponsResp.data;
        const jsonStart = jsonString.indexOf('[');
        
        if (jsonStart !== -1) {
          // Find the actual end of the JSON array by looking for the last ']' 
          // that's followed by whitespace or end of string (not HTML/JS)
          let jsonEnd = -1;
          for (let i = jsonString.length - 1; i >= jsonStart; i--) {
            if (jsonString[i] === ']') {
              // Check if this ']' is followed by whitespace or end of string
              const after = jsonString.substring(i + 1).trim();
              if (after === '' || after.startsWith('<') || after.startsWith('\n<script')) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          if (jsonEnd === -1) {
            // Fallback: use lastIndexOf
            jsonEnd = jsonString.lastIndexOf(']');
          }
          
          if (jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
            console.log('   Extracted JSON substring (length:', jsonString.length, ')');
          }
        }
        
        try {
          couponsData = JSON.parse(jsonString);
          console.log('   ✅ Successfully parsed JSON string');
          console.log('   Parsed data type:', typeof couponsData);
          console.log('   Parsed data is array:', Array.isArray(couponsData));
        } catch (parseError) {
          console.log('   ❌ Failed to parse JSON:', parseError.message);
          console.log('   String preview (first 500 chars):', couponsResp.data.substring(0, 500));
          console.log('   String end preview (last 200 chars):', couponsResp.data.substring(Math.max(0, couponsResp.data.length - 200)));
        }
      }
      
      if (Array.isArray(couponsData)) {
        console.log(`   📊 Found ${couponsData.length} coupons`);
        if (couponsData.length > 0) {
          console.log('   Sample coupon:', {
            id: couponsData[0].id,
            code: couponsData[0].code,
            amount: couponsData[0].amount,
            discount_type: couponsData[0].discount_type
          });
        }
      } else if (couponsData && typeof couponsData === 'object') {
        console.log('   Response.data keys:', Object.keys(couponsData));
        if (couponsData.coupons && Array.isArray(couponsData.coupons)) {
          console.log(`   📊 Found ${couponsData.coupons.length} coupons in data.coupons`);
        }
      } else {
        console.log('   ⚠️  Unexpected response format');
        console.log('   Data preview:', typeof couponsData === 'string' ? couponsData.substring(0, 200) : String(couponsData).substring(0, 200));
      }
      console.log('');
    } catch (error) {
      console.error('❌ Coupons request failed:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Status Text:', error.response.statusText);
        try {
          console.error('   Data:', typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data, null, 2));
        } catch (e) {
          console.error('   Data (circular):', String(error.response.data).substring(0, 200));
        }
      }
      console.log('');
    }

    // Test fetching products
    console.log('📦 Testing products endpoint...');
    try {
      const productsResp = await client.get('products', { per_page: 10, page: 1, on_sale: 'true' });
      console.log('✅ Products request successful!');
      console.log('   Response status:', productsResp.status);
      console.log('   Response type:', typeof productsResp);
      console.log('   Response.data type:', typeof productsResp.data);
      console.log('   Response.data is array:', Array.isArray(productsResp.data));
      
      // Handle string response - parse it as JSON
      let productsData = productsResp.data;
      if (typeof productsResp.data === 'string') {
        console.log('   ⚠️  Response.data is a string, attempting to parse as JSON...');
        console.log('   String length:', productsResp.data.length);
        
        // Try to extract JSON part if HTML is mixed in
        let jsonString = productsResp.data;
        const jsonStart = jsonString.indexOf('[');
        
        if (jsonStart !== -1) {
          // Find the actual end of the JSON array by looking for the last ']' 
          // that's followed by whitespace or end of string (not HTML/JS)
          let jsonEnd = -1;
          for (let i = jsonString.length - 1; i >= jsonStart; i--) {
            if (jsonString[i] === ']') {
              // Check if this ']' is followed by whitespace or end of string
              const after = jsonString.substring(i + 1).trim();
              if (after === '' || after.startsWith('<') || after.startsWith('\n<script')) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          if (jsonEnd === -1) {
            // Fallback: use lastIndexOf
            jsonEnd = jsonString.lastIndexOf(']');
          }
          
          if (jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
            console.log('   Extracted JSON substring (length:', jsonString.length, ')');
          }
        }
        
        try {
          productsData = JSON.parse(jsonString);
          console.log('   ✅ Successfully parsed JSON string');
          console.log('   Parsed data type:', typeof productsData);
          console.log('   Parsed data is array:', Array.isArray(productsData));
        } catch (parseError) {
          console.log('   ❌ Failed to parse JSON:', parseError.message);
          console.log('   String preview (first 500 chars):', productsResp.data.substring(0, 500));
          console.log('   String end preview (last 200 chars):', productsResp.data.substring(Math.max(0, productsResp.data.length - 200)));
        }
      }
      
      if (Array.isArray(productsData)) {
        console.log(`   📊 Found ${productsData.length} products`);
        if (productsData.length > 0) {
          console.log('   Sample product:', {
            id: productsData[0].id,
            name: productsData[0].name,
            on_sale: productsData[0].on_sale,
            regular_price: productsData[0].regular_price,
            sale_price: productsData[0].sale_price
          });
        }
      } else if (productsData && typeof productsData === 'object') {
        console.log('   Response.data keys:', Object.keys(productsData));
        if (productsData.products && Array.isArray(productsData.products)) {
          console.log(`   📊 Found ${productsData.products.length} products in data.products`);
        }
      } else {
        console.log('   ⚠️  Unexpected response format');
        console.log('   Data preview:', typeof productsData === 'string' ? productsData.substring(0, 200) : String(productsData).substring(0, 200));
      }
      console.log('');
    } catch (error) {
      console.error('❌ Products request failed:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Status Text:', error.response.statusText);
        try {
          console.error('   Data:', typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data, null, 2));
        } catch (e) {
          console.error('   Data (circular):', String(error.response.data).substring(0, 200));
        }
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

testWooCommerce();


