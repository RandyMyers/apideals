const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewSchema = new Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' }, // Reference to the visitor (optional for logged-in users)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Reference to the user (for logged-in users)
    entityType: { type: String, enum: ['store', 'coupon', 'deal', 'category'], default: null }, // Type of entity viewed
    entityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityModel' }, // Dynamic reference
    entityModel: { type: String, enum: ['Store', 'Coupon', 'Deal', 'Category'] }, // Model name for dynamic ref
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Reference to a store (for backward compatibility)
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }, // Reference to a coupon (for backward compatibility)
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' }, // Reference to a deal (for backward compatibility)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // Reference to a category (for backward compatibility)
    viewedAt: { type: Date, default: Date.now }, // Timestamp
    createdAt: { type: Date, default: Date.now }, // Alias for viewedAt for consistency
});

// Index for efficient queries
ViewSchema.index({ userId: 1, viewedAt: -1 });
ViewSchema.index({ visitorId: 1, viewedAt: -1 });
ViewSchema.index({ entityType: 1, entityId: 1 });

const View = mongoose.model('View', ViewSchema);

module.exports = View;
