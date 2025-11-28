const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InteractionSchema = new Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' }, // Reference to the visitor (optional for logged-in users)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Reference to the user (for logged-in users)
    interactionType: { type: String, required: true, enum: ['follow', 'unfollow', 'share', 'click', 'hover', 'saved', 'unsaved'] }, // Type of interaction
    entityType: { type: String, enum: ['store', 'coupon', 'deal', 'category'], default: null }, // Type of entity interacted with
    entityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityModel' }, // Dynamic reference
    entityModel: { type: String, enum: ['Store', 'Coupon', 'Deal', 'Category'] }, // Model name for dynamic ref
    type: { type: String }, // Legacy field (deprecated, use interactionType)
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null }, // Reference to Store (for backward compatibility)
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null }, // Reference to Coupon (for backward compatibility)
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null }, // Reference to Deal (for backward compatibility)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // Reference to Category (for backward compatibility)
    interactionAt: { type: Date, default: Date.now }, // Timestamp
    createdAt: { type: Date, default: Date.now }, // Alias for interactionAt for consistency
});

// Index for efficient queries
InteractionSchema.index({ userId: 1, interactionAt: -1 });
InteractionSchema.index({ visitorId: 1, interactionAt: -1 });
InteractionSchema.index({ interactionType: 1, entityType: 1 });

const Interaction = mongoose.model('Interaction', InteractionSchema);

module.exports = Interaction;
