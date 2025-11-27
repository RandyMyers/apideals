const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewSchema = new Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true }, // Reference to the visitor
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Reference to a store
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }, // Reference to a coupon
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' }, // Reference to a deal
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // Reference to a category
    viewedAt: { type: Date, default: Date.now }, // Timestamp
});

const View = mongoose.model('View', ViewSchema);

module.exports = View;
