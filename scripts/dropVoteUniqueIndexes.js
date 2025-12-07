/**
 * Drop unique indexes from votes collection
 * This allows multiple votes per user per coupon/deal
 * 
 * Usage: node server/scripts/dropVoteUniqueIndexes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
    if (!mongoUri) {
      throw new Error('MONGODB_URI, MONGO_URI, or MONGO_URL environment variable is not set');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    return false;
  }
};

async function dropUniqueIndexes() {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    const db = mongoose.connection.db;
    const votesCollection = db.collection('votes');

    // Get all indexes
    const indexes = await votesCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop unique indexes
    try {
      await votesCollection.dropIndex('userId_1_couponId_1');
      console.log('✓ Dropped index: userId_1_couponId_1');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('⚠ Index userId_1_couponId_1 not found (may already be dropped)');
      } else {
        console.error('Error dropping userId_1_couponId_1:', error.message);
      }
    }

    try {
      await votesCollection.dropIndex('userId_1_dealId_1');
      console.log('✓ Dropped index: userId_1_dealId_1');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('⚠ Index userId_1_dealId_1 not found (may already be dropped)');
      } else {
        console.error('Error dropping userId_1_dealId_1:', error.message);
      }
    }

    // Recreate non-unique indexes for performance
    await votesCollection.createIndex({ userId: 1, couponId: 1 }, { sparse: true, name: 'userId_1_couponId_1' });
    console.log('✓ Created non-unique index: userId_1_couponId_1');

    await votesCollection.createIndex({ userId: 1, dealId: 1 }, { sparse: true, name: 'userId_1_dealId_1' });
    console.log('✓ Created non-unique index: userId_1_dealId_1');

    // Show final indexes
    const finalIndexes = await votesCollection.indexes();
    console.log('\nFinal indexes:', JSON.stringify(finalIndexes, null, 2));

    console.log('\n✅ Successfully updated vote indexes!');
  } catch (error) {
    console.error('Error dropping indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

if (require.main === module) {
  dropUniqueIndexes();
}

module.exports = dropUniqueIndexes;

