const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InteractionSchema = new Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true }, // Reference to the visitor
    type: { type: String, required: true }, // e.g., 'click', 'hover'
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null }, // Reference to Store
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null }, // Reference to Coupon
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null }, // Reference to Deal
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // Reference to Category
    interactionAt: { type: Date, default: Date.now }, // Timestamp
});

const Interaction = mongoose.model('Interaction', InteractionSchema);

module.exports = Interaction;
