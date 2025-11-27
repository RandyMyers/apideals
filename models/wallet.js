const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  
  // Reserved balance for active campaigns (cannot be used until campaign ends)
  reservedBalance: {
    type: Number,
    default: 0,
    min: [0, 'Reserved balance cannot be negative']
  },
  
  // Total amount ever deposited
  totalDeposited: {
    type: Number,
    default: 0
  },
  
  // Total amount ever spent
  totalSpent: {
    type: Number,
    default: 0
  },
  
  // Currency (default USD)
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware
WalletSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure balance integrity
  const availableBalance = this.balance - this.reservedBalance;
  if (availableBalance < 0) {
    return next(new Error('Available balance cannot be negative'));
  }
  
  next();
});

// Instance method: Get available balance (balance - reserved)
WalletSchema.methods.getAvailableBalance = function() {
  return Math.max(0, this.balance - this.reservedBalance);
};

// Instance method: Check if sufficient balance for amount
WalletSchema.methods.hasSufficientBalance = function(amount) {
  return this.getAvailableBalance() >= amount;
};

// Instance method: Reserve balance (for active campaigns)
WalletSchema.methods.reserveBalance = function(amount) {
  if (!this.hasSufficientBalance(amount)) {
    throw new Error('Insufficient balance to reserve');
  }
  this.reservedBalance += amount;
  return this.save();
};

// Instance method: Release reserved balance
WalletSchema.methods.releaseReservedBalance = function(amount) {
  this.reservedBalance = Math.max(0, this.reservedBalance - amount);
  return this.save();
};

// Static method: Get or create wallet for user
WalletSchema.statics.getOrCreateWallet = async function(userId) {
  if (!userId) {
    throw new Error('UserId is required');
  }
  
  let wallet = await this.findOne({ userId });
  if (!wallet) {
    wallet = await this.create({ 
      userId,
      balance: 0,
      reservedBalance: 0,
      totalDeposited: 0,
      totalSpent: 0,
      currency: 'USD'
    });
  }
  return wallet;
};

const Wallet = mongoose.model('Wallet', WalletSchema);
module.exports = Wallet;

