const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Share Model
 * Tracks when users share coupons or deals on social media
 */
const ShareSchema = new Schema({
  entityType: {
    type: String,
    enum: ['coupon', 'deal'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional - can track anonymous shares
  },
  platform: {
    type: String,
    enum: ['facebook', 'twitter', 'whatsapp', 'email', 'copy'],
    required: true,
    default: 'copy'
  },
  sharedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
ShareSchema.index({ entityType: 1, entityId: 1 });
ShareSchema.index({ userId: 1 });
ShareSchema.index({ sharedAt: -1 });

const Share = mongoose.model('Share', ShareSchema);

module.exports = Share;

