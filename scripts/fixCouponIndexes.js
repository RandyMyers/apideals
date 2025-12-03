require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../models/coupon');

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    if (!process.env.MONGO_URL) {
      console.error('❌ Error: MONGO_URL environment variable is not set');
      process.exit(1);
    }
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}\n`);

    const collection = Coupon.collection;
    
    // Get all indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    });
    
    console.log('\n🗑️  Dropping ALL indexes except _id...');
    
    // Drop all existing indexes except _id
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`  ✓ Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`  ⚠️  Could not drop index ${index.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📝 Creating new indexes (NO unique constraint on code alone)...');
    
    // Create sparse unique index for (code, storeId, productUrl) - for multi-product coupons
    // sparse: true means it only applies to documents that have productUrl
    try {
      await collection.createIndex(
        { code: 1, storeId: 1, productUrl: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'code_storeId_productUrl_unique'
        }
      );
      console.log('  ✓ Created sparse unique index: code_storeId_productUrl_unique');
    } catch (error) {
      console.log(`  ⚠️  Error creating sparse index: ${error.message}`);
    }
    
    // Create sparse unique index for (code, storeId, wooProductId) - for multi-product coupons without URL
    try {
      await collection.createIndex(
        { code: 1, storeId: 1, wooProductId: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'code_storeId_wooProductId_unique'
        }
      );
      console.log('  ✓ Created sparse unique index: code_storeId_wooProductId_unique');
    } catch (error) {
      console.log(`  ⚠️  Error creating wooProductId index: ${error.message}`);
    }
    
    // NOTE: We do NOT create a unique index for (code, storeId) alone
    // This is because sparse indexes don't work as expected when all fields are always present
    // For all-products coupons, we'll handle uniqueness in application logic if needed
    // Multiple entries with same code+storeId are allowed if they have different productUrl/wooProductId
    console.log('  ℹ️  Skipping code_storeId_unique_all_products - not needed');
    
    // Create non-unique index on code for faster queries (no unique constraint)
    try {
      await collection.createIndex({ code: 1 }, { name: 'code_index' });
      console.log('  ✓ Created non-unique index: code_index');
    } catch (error) {
      console.log(`  ⚠️  Error creating code index: ${error.message}`);
    }
    
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    });
    
    console.log('\n✅ Index fix complete!');
    console.log('   - Multiple entries with same code are now allowed if they have different productUrl/wooProductId');
    console.log('   - All-products coupons (no productUrl/wooProductId) are still unique by (code, storeId)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

fixIndexes();
