const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UrlRedirectSchema = new Schema({
  // Old WordPress URL (the path part, e.g., /blog/my-post or /category/tech)
  oldPath: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // New React app URL path
  newPath: {
    type: String,
    required: true,
    trim: true
  },
  
  // Redirect type: 301 (permanent) or 302 (temporary)
  redirectType: {
    type: Number,
    enum: [301, 302],
    default: 301
  },
  
  // Optional: Reference to blog post, store, coupon, etc. if applicable
  referenceType: {
    type: String,
    enum: ['blog', 'store', 'coupon', 'deal', 'category', 'page', 'other'],
    default: 'other'
  },
  
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType',
    required: false
  },
  
  // Track redirect usage
  hitCount: {
    type: Number,
    default: 0
  },
  
  lastHitAt: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Notes for admin
  notes: {
    type: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookups
UrlRedirectSchema.index({ oldPath: 1, isActive: 1 });
UrlRedirectSchema.index({ referenceType: 1, referenceId: 1 });

// Pre-save middleware
UrlRedirectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Normalize oldPath: remove leading/trailing slashes, lowercase
  if (this.oldPath) {
    this.oldPath = this.oldPath.toLowerCase().replace(/^\/+|\/+$/g, '');
    if (!this.oldPath.startsWith('/')) {
      this.oldPath = '/' + this.oldPath;
    }
  }
  next();
});

// Method to increment hit count
UrlRedirectSchema.methods.recordHit = function() {
  this.hitCount += 1;
  this.lastHitAt = new Date();
  return this.save();
};

const UrlRedirect = mongoose.model('UrlRedirect', UrlRedirectSchema);

module.exports = UrlRedirect;

