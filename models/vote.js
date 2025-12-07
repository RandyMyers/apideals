const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VoteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  couponId: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
    required: false,
    index: true,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    required: false,
    index: true,
  },
  type: {
    type: String,
    enum: ['up', 'down'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure either couponId or dealId is provided, but not both
VoteSchema.pre('validate', function (next) {
  if (!this.couponId && !this.dealId) {
    return next(new Error('Either couponId or dealId must be provided'));
  }
  if (this.couponId && this.dealId) {
    return next(new Error('Cannot provide both couponId and dealId'));
  }
  next();
});

// Automatically update the updatedAt field before saving
VoteSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for efficient queries (NOT unique - allow multiple votes per user)
// Note: We use sparse indexes to allow null values for couponId/dealId
VoteSchema.index({ userId: 1, couponId: 1 }, { 
  sparse: true,
  name: 'userId_1_couponId_1',
  // Drop existing unique index if it exists (one-time migration)
  background: true
});
VoteSchema.index({ userId: 1, dealId: 1 }, { 
  sparse: true,
  name: 'userId_1_dealId_1',
  background: true
});

// Static method to migrate indexes (drop unique constraints)
VoteSchema.statics.migrateIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();
    
    // Check if unique indexes exist and drop them
    for (const index of indexes) {
      const indexName = index.name;
      const isUnique = index.unique === true;
      
      // Check if this is one of our compound indexes with unique constraint
      if (isUnique && (indexName === 'userId_1_couponId_1' || indexName === 'userId_1_dealId_1')) {
        try {
          await collection.dropIndex(indexName);
          console.log(`✓ Dropped unique index: ${indexName}`);
        } catch (error) {
          if (error.codeName !== 'IndexNotFound') {
            console.error(`Error dropping index ${indexName}:`, error.message);
          }
        }
      }
    }
    
    // Ensure non-unique indexes exist
    try {
      await collection.createIndex({ userId: 1, couponId: 1 }, { 
        sparse: true, 
        name: 'userId_1_couponId_1',
        background: true 
      });
    } catch (error) {
      // Index might already exist, that's okay
      if (error.codeName !== 'IndexOptionsConflict' && error.codeName !== 'IndexKeySpecsConflict') {
        console.error('Error creating index userId_1_couponId_1:', error.message);
      }
    }
    
    try {
      await collection.createIndex({ userId: 1, dealId: 1 }, { 
        sparse: true, 
        name: 'userId_1_dealId_1',
        background: true 
      });
    } catch (error) {
      // Index might already exist, that's okay
      if (error.codeName !== 'IndexOptionsConflict' && error.codeName !== 'IndexKeySpecsConflict') {
        console.error('Error creating index userId_1_dealId_1:', error.message);
      }
    }
    
    console.log('✓ Vote indexes migration completed');
  } catch (error) {
    console.error('Error migrating vote indexes:', error);
  }
};

// Index for efficient vote counting
VoteSchema.index({ couponId: 1, type: 1 });
VoteSchema.index({ dealId: 1, type: 1 });

const Vote = mongoose.model('Vote', VoteSchema);

module.exports = Vote;


