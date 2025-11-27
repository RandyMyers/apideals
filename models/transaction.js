const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  
  // Transaction type
  type: {
    type: String,
    enum: [
      'deposit',      // Adding funds to wallet
      'withdrawal',   // Withdrawing funds (if enabled)
      'campaign_spend', // Spending on campaign (click/interaction)
      'campaign_reserve', // Reserving balance for campaign
      'campaign_refund',  // Refunding unused campaign budget
      'refund'        // General refund
    ],
    required: true
  },
  
  // Amount (positive for deposits, negative for withdrawals/spends)
  amount: {
    type: Number,
    required: true
  },
  
  // Balance after this transaction
  balanceAfter: {
    type: Number,
    required: true
  },
  
  // Payment reference (for deposits via payment gateway)
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  // Campaign reference (if transaction is campaign-related)
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  // Description/notes
  description: {
    type: String,
    trim: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  
  // Metadata (for additional info)
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We'll use createdAt manually
});

// Indexes
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ walletId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, createdAt: -1 });
TransactionSchema.index({ campaignId: 1 });
TransactionSchema.index({ paymentId: 1 });
TransactionSchema.index({ status: 1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction;

