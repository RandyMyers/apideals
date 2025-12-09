const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewSchema = new Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' }, // Reference to the visitor (optional for logged-in users)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Reference to the user (for logged-in users)
    entityType: { type: String, enum: ['store', 'coupon', 'deal', 'category', 'blog', 'page'], default: null }, // Type of entity viewed
    entityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityModel' }, // Dynamic reference
    entityModel: { type: String, enum: ['Store', 'Coupon', 'Deal', 'Category', 'Blog'], default: null }, // Model name for dynamic ref (null for general pages)
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Reference to a store (for backward compatibility)
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }, // Reference to a coupon (for backward compatibility)
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' }, // Reference to a deal (for backward compatibility)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // Reference to a category (for backward compatibility)
    blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }, // Reference to a blog (for backward compatibility)
    pagePath: { type: String, index: true }, // Full URL path (e.g., '/sv/coupons/all')
    languageCode: { type: String, index: true }, // Language prefix from URL (e.g., 'sv', 'en')
    referrer: { type: String }, // HTTP referrer header
    isLandingPage: { type: Boolean, default: false, index: true }, // First page in session
    viewedAt: { type: Date, default: Date.now }, // Timestamp
    createdAt: { type: Date, default: Date.now }, // Alias for viewedAt for consistency
});

// Index for efficient queries
ViewSchema.index({ userId: 1, viewedAt: -1 });
ViewSchema.index({ visitorId: 1, viewedAt: -1 });
ViewSchema.index({ entityType: 1, entityId: 1 });
ViewSchema.index({ pagePath: 1, viewedAt: -1 });
ViewSchema.index({ languageCode: 1, viewedAt: -1 });
ViewSchema.index({ isLandingPage: 1, viewedAt: -1 });
ViewSchema.index({ viewedAt: -1 }); // For live activity queries

const View = mongoose.model('View', ViewSchema);

module.exports = View;
